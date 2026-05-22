---
name: subwave-picker-benchmark
description: >-
  Benchmark and compare LLM models for the SUB/WAVE DJ picker agent using
  controller/scripts/picker-test.mjs. Use this skill whenever the user wants to
  assess, benchmark, compare, or test which LLM model to use for the picker /
  DJ agent — phrases like "which model should I use for the picker", "benchmark
  the picker", "test these models", "is <model> a good fit for the DJ agent",
  "compare the ollama models", "assess model reliability", "run picker-test", or
  is diagnosing slow / failing djAgentPick calls and suspects the model choice.
  Trigger it even if the user doesn't name the harness — any request to
  evaluate picker reliability or pick a model for SUB/WAVE belongs here. This
  skill only measures and recommends; it does NOT change the live station's
  configured model.
---

# SUB/WAVE picker model benchmark

The DJ picker agent (`djAgentPick`) runs a tool-loop: the model calls
music-discovery tools, then commits to a track. Its reliability depends almost
entirely on **how well the chosen model follows the tool-calling protocol** —
a model that ignores `toolChoice` and answers with prose makes the picker fail.
`controller/scripts/picker-test.mjs` drives this exact path in isolation so you
can measure a model's fit before trusting it on air.

This skill runs that harness across candidate models and turns the raw output
into a comparison the operator can act on. It is **read-only**: the harness
overrides provider/model only inside its own short-lived process, so the live
controller's configured model is never touched.

## When NOT to use this

- Changing the live model — that's a Settings/admin change, not this skill.
- Diagnosing the station's general runtime behaviour — that's
  `subwave-log-analysis`.
- Starting/stopping the stack — that's `subwave-control`.

## Prerequisites

The stack must be running (dev or prod) — the harness runs **inside** the
`sub-wave-controller` container. If it isn't up, hand off to `subwave-control`
to start it first. Check with:

```bash
docker ps --filter name=sub-wave-controller --format '{{.Names}} {{.Status}}'
```

## Quick start — the bundled script

`scripts/assess-models.sh` runs the harness for one or more models in **both**
`short` and `long` message modes, prints a comparison table, and summarises the
failure reasons it found in the event log. Derive the repo root from this
skill's own location so the script path is stable:

```bash
REPO=$(git -C "<this skill's base directory>" rev-parse --show-toplevel)
bash "$REPO/.claude/skills/subwave-picker-benchmark/scripts/assess-models.sh" ollama 10 glm-5.1:cloud kimi-k2.6:cloud
```

Arguments: `assess-models.sh <provider> [iterations] <model>...`

- `provider` — `ollama` | `openai-compatible` | `anthropic` | `openai` |
  `google` | `deepseek` | `openrouter` | `gateway`.
- `iterations` — runs per model per mode. Optional (default 10). **Use 8–10 to
  screen, 20+ to confirm a winner** — cloud models are non-deterministic, so a
  small sample is noisy.
- `model...` — one or more model ids. If omitted and provider is `ollama`, the
  script discovers every model installed on the Ollama box and tests them all.

A full run can take many minutes (each iteration is a real model call). Run the
`Bash` tool with a long timeout, or in the background, and don't poll it.

## Manual invocation

To run a single model yourself, or pass custom args, call the harness directly.
Two things matter:

- **Run it with `tsx`, not plain `node`.** The harness imports the controller's
  TypeScript source; `node` fails with `ERR_MODULE_NOT_FOUND` on `src/*.js`.
- **Run it inside the container** (cwd is `/app`):

```bash
docker exec sub-wave-controller npx tsx scripts/picker-test.mjs <provider> <model> [iterations] [short|long]
```

Example: `docker exec sub-wave-controller npx tsx scripts/picker-test.mjs ollama glm-5.1:cloud 20 long`

`short` = 3 clean turns (sterile baseline). `long` = a realistic session window.
Run **both** — `long` catches long-context regressions that `short` hides.

## Reading the results

The harness prints per-iteration `OK`/`FAIL` lines and a summary:

```
=== summary ===
  success: 19/20 (95%)
  modes:   ok=19  thrown=1
  ms (ok): median=1824 p95=3641
  ms (fail): median=2741
  median tool calls per ok: 2
```

Judge models in this order:

1. **Success rate — the deciding metric.** The picker must reliably return a
   valid track. Below ~90% the model is a poor fit. There is a stateless pool
   picker behind every failure, so a failed pick degrades rather than breaks —
   but a model that fails often isn't doing the job it was chosen for.
2. **Latency.** A pick only has to finish before the current track ends
   (~3 min), so even ~20 s is functional — but faster is better, and a healthy
   model is usually well under 10 s. Compare `ms (ok)` medians; watch `p95` for
   models that are usually fast but occasionally stall.
3. **Failure modes.** A model can hit the same success rate for very different
   reasons — see the glossary below. The script pulls the actual error strings
   from the event log so you can tell a bad-fit model from a provider outage.
4. **`short` vs `long` parity.** A model that does well on `short` but drops on
   `long` is sensitive to session-context length — note it.

## Failure mode glossary

The harness `modes` line buckets failures; the real error strings come from the
event log (`kind: pickerTest`, `ok: false`). What each means:

- **`agent did not call the done tool before stopping`** — the model answered
  with prose instead of calling tools. This is a **model-fit problem**: the
  model ignores the tool-calling protocol. A high rate here means "pick a
  different model" — no config change fixes it.
- **`The operation was aborted due to timeout`** — the model (or its tool loop)
  exceeded the picker's `timeoutMs` ceiling. Means the model is too slow or is
  looping. Compare against other models' latency before blaming the harness.
- **`Failed after N attempts. Last error: Internal Server Error`** — the
  provider returned HTTP 5xx. A **provider-side outage**, transient — not the
  model's fault. Re-run later; don't reject a model on this alone.
- **`hallucinated-id` / `no-object-generated`** — the model returned an id not
  in any tool result, or output the SDK couldn't parse into the pick schema.
  Both indicate weak structured-output / instruction-following.

## Producing the recommendation

After the runs, give the operator a compact comparison and a clear call:

1. A table — one row per model (and per mode), with success rate, median
   latency, p95, and the dominant failure mode.
2. A one-line recommendation naming the best model, with the reason
   ("highest success rate at lowest latency", "only model above 95% on `long`").
3. Call out anything disqualifying — a model that 500s throughout (re-test
   later, verdict deferred), or one that's reliable but markedly slow.

Do **not** apply the model. Tell the operator to set it via the admin Settings
UI (or `settings.llm.model`) — `settings.llm.model` is global, so it changes
every DJ generation, not just the picker, and that's their call to make.

## Notes

- The harness uses the **live** `pickSystem` prompt and `PICK_SCHEMA` imported
  from `dj-agent.js`, with synthetic discovery tools — so it tests the real
  prompt and schema, but not real Subsonic network latency.
- Each harness run appends `kind: pickerTest` rows to the controller's event
  log (`state/logs/events-*.jsonl`). Harmless and filterable, but worth knowing
  if you later analyse that log.
