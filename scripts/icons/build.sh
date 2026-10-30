#!/bin/sh
# Regenerate every icon from the brand font: outlined SVGs, then PNGs and favicon.ico.
# Needs python3 and node. Python deps live in a throwaway venv under node_modules/.cache.
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
VENV="$ROOT/node_modules/.cache/icons-venv"

if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
"$VENV/bin/pip" install --quiet --requirement "$ROOT/scripts/icons/requirements.txt"

"$VENV/bin/python" -I "$ROOT/scripts/icons/outline.py" \
  "$ROOT/docs/assets/fonts/space-grotesk-700-latin.woff2" \
  "$ROOT/docs/assets/fonts/inter-latin.woff2" \
  "$ROOT/docs/assets/images"
node "$ROOT/scripts/icons/render.mjs"
