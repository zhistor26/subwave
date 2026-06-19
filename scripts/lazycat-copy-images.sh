#!/usr/bin/env bash
# Copy SUB/WAVE service images to registry.lazycat.cloud (required for app store upload).
# Usage:
#   lzc-cli appstore login -u YOUR_USER -p 'YOUR_PASS'
#   ./scripts/lazycat-copy-images.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! node -e "
import fs from 'fs';
const p = process.env.HOME + '/.config/lazycat/box-config.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
if (!j.token) process.exit(1);
" 2>/dev/null; then
  echo "请先登录: lzc-cli appstore login -u 用户名 -p '密码'" >&2
  exit 1
fi

# macOS /bin/bash is 3.2 — no associative arrays
service_for() {
  case "$1" in
    subwave-caddy) echo caddy ;;
    subwave-broadcast) echo broadcast ;;
    subwave-controller) echo controller ;;
    subwave-web) echo web ;;
    *) echo "unknown image: $1" >&2; return 1 ;;
  esac
}

MANIFEST="$ROOT/lzc-manifest.yml"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

for img in subwave-caddy subwave-broadcast subwave-controller subwave-web; do
  src="ghcr.io/perminder-klair/${img}:latest"
  echo "==> copy-image $src"
  out="$(lzc-cli appstore copy-image "$src" 2>&1 | tee /dev/stderr | rg 'registry\.lazycat\.cloud/\S+' -o | tail -1)"
  if [[ -z "$out" ]]; then
    echo "copy-image 未返回 registry 地址: $src" >&2
    exit 1
  fi
  svc="$(service_for "$img")"
  echo "$svc=$out" >> "$TMP"
  embed_df="$ROOT/docker/lzc-embed/${svc}.Dockerfile"
  if [[ -f "$embed_df" ]]; then
    printf 'FROM %s\n' "$out" > "$embed_df"
    echo "    updated $embed_df"
  fi
done

python3 << PY
from pathlib import Path
manifest = Path("$MANIFEST")
lines = manifest.read_text().splitlines()
mapping = {}
for line in Path("$TMP").read_text().splitlines():
    k, v = line.split("=", 1)
    mapping[k] = v
out = []
for line in lines:
    replaced = line
    for svc, reg in mapping.items():
        if line.strip().startswith("image:") and f"  {svc}:" in "".join(out[-3:]):
            replaced = f"    image: {reg}"
            break
    out.append(replaced)
manifest.write_text("\\n".join(out) + "\\n")
print("Updated", manifest)
for svc, reg in mapping.items():
    print(f"  {svc}: {reg}")
PY

echo ""
echo "Done. Next:"
echo "  lzc-cli project build"
echo "  lzc-cli lpk lint ./cloud.lazycat.app.subwave-*.lpk"
echo "  lzc-cli appstore publish ./cloud.lazycat.app.subwave-*.lpk"
