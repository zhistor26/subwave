#!/usr/bin/env bash
# Benchmark candidate LLM models for the SUB/WAVE DJ picker agent.
#
# Runs controller/scripts/picker-test.mjs inside the controller container
# across one or more models, in both `short` and `long` message modes, then
# prints a comparison table and a summary of the failure reasons found in the
# event log.
#
# Read-only: picker-test.mjs overrides provider/model only inside its own
# short-lived process, so the live station's configured model is never changed.
set -uo pipefail

CONTAINER=sub-wave-controller

usage() {
  cat <<'EOF'
Usage: assess-models.sh <provider> [iterations] <model> [<model> ...]

  provider     ollama | openai-compatible | anthropic | openai | google |
               deepseek | openrouter | gateway
  iterations   runs per model per mode (default 10; use 20+ to confirm a winner)
  model ...    one or more model ids. If omitted and provider is ollama, every
               model installed on the Ollama box is discovered and tested.

Examples:
  assess-models.sh ollama 10 glm-5.1:cloud kimi-k2.6:cloud
  assess-models.sh ollama 20 glm-5.1:cloud
  assess-models.sh ollama                 # auto-discover + test all ollama models
EOF
}

[ $# -lt 1 ] && { usage; exit 2; }

PROVIDER=$1; shift

# Optional second positional: iterations, if it's all digits.
ITERS=10
if [ $# -gt 0 ] && [[ $1 =~ ^[0-9]+$ ]]; then
  ITERS=$1; shift
fi

MODELS=("$@")

# Container must be up — the harness runs inside it.
if ! docker ps --filter "name=^/${CONTAINER}$" --format '{{.Names}}' | grep -q .; then
  echo "error: container '${CONTAINER}' is not running — start the stack first (subwave-control)." >&2
  exit 1
fi

# Auto-discover ollama models when none were named.
if [ ${#MODELS[@]} -eq 0 ]; then
  if [ "$PROVIDER" != "ollama" ]; then
    echo "error: no models given — auto-discovery is only supported for provider 'ollama'." >&2
    exit 2
  fi
  echo "Discovering models on the Ollama box..."
  mapfile -t MODELS < <(
    docker exec "$CONTAINER" sh -c 'curl -s http://host.docker.internal:11434/api/tags' \
      | python3 -c 'import json,sys; [print(m["name"]) for m in json.load(sys.stdin).get("models",[])]' 2>/dev/null
  )
  [ ${#MODELS[@]} -eq 0 ] && { echo "error: discovered no models — is the Ollama box reachable?" >&2; exit 1; }
  echo "Found: ${MODELS[*]}"
fi

echo
echo "=== picker benchmark: provider=${PROVIDER}  iterations=${ITERS}  models=${#MODELS[@]} ==="
echo

ROWS=$(mktemp)
echo -e "MODEL\tMODE\tSUCCESS\tms_median\tms_p95\ttoolcalls" > "$ROWS"

# extract <picker-test summary text> -> tab-separated metrics for the table
parse_summary() {
  python3 - "$1" "$2" "$3" <<'PY'
import re, sys
model, mode, out = sys.argv[1], sys.argv[2], sys.argv[3]
def find(pat, default="-"):
    m = re.search(pat, out)
    return m.group(1) if m else default
success = find(r"success:\s*([0-9]+/[0-9]+ \([0-9]+%\))")
ms_med  = find(r"ms \(ok\):\s*median=(\S+)")
ms_p95  = find(r"ms \(ok\):.*p95=(\S+)")
tools   = find(r"median tool calls per ok:\s*(\S+)")
print(f"{model}\t{mode}\t{success}\t{ms_med}\t{ms_p95}\t{tools}")
PY
}

for MODEL in "${MODELS[@]}"; do
  for MODE in short long; do
    echo "--- ${MODEL} (${MODE}) ---"
    OUT=$(docker exec "$CONTAINER" npx tsx scripts/picker-test.mjs \
            "$PROVIDER" "$MODEL" "$ITERS" "$MODE" 2>&1)
    # Echo the per-iteration + summary lines so a live run is observable.
    echo "$OUT" | grep -E '^\s*(OK|FAIL|success:|modes:|ms \(|median tool)' || echo "  (no summary — run errored)"
    parse_summary "$MODEL" "$MODE" "$OUT" >> "$ROWS"
    echo
  done
done

echo "================ comparison ================"
column -t -s$'\t' "$ROWS"
rm -f "$ROWS"
echo

# Failure reasons: pull the real error strings from the event log. The harness
# `modes` line only buckets failures — the event log has the actual cause.
echo "============ failure reasons (recent pickerTest calls) ============"
docker exec "$CONTAINER" sh -c 'cat /var/sub-wave/logs/events-*.jsonl 2>/dev/null' \
  | python3 - "${MODELS[@]}" <<'PY'
import json, sys
wanted = set(sys.argv[1:])
counts = {}
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        e = json.loads(line)
    except Exception:
        continue
    if e.get("type") != "llm" or e.get("kind") != "pickerTest" or e.get("ok"):
        continue
    model = (e.get("model") or "").removeprefix("ollama:").removeprefix("openai-compatible:")
    # match against bare model ids the user passed
    if wanted and not any(w in (e.get("model") or "") for w in wanted):
        continue
    key = (e.get("model"), e.get("error") or "(no error string)")
    counts[key] = counts.get(key, 0) + 1
if not counts:
    print("  (no pickerTest failures in the event log)")
else:
    for (model, err), n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {n:>3}x  {model}  |  {err}")
PY
echo
echo "Done. Judge on success rate first, then latency. See SKILL.md for the"
echo "failure-mode glossary and how to phrase the recommendation."
