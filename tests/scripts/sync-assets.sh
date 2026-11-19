#!/usr/bin/env bash
# Recopie les assets CSS/JS du template dans le output d'un IG déjà construit.
# Suffisant pour itérer sur aphp-ig.css / sidebar-nav.js sans relancer le
# publisher (~7 min). Toute modification Liquid (includes/) exige un rebuild.
# Usage : tests/scripts/sync-assets.sh <chemin-ig> [ref-git]
#   ref-git (optionnel) : copie les assets depuis un commit (ex. 15a5b2c pour la référence).
set -euo pipefail
TEMPLATE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(cd "$1" && pwd)/output/assets"
REF="${2:-}"
for f in css/aphp-ig.css js/sidebar-nav.js; do
  if [ -n "$REF" ]; then git -C "$TEMPLATE_DIR" show "$REF:content/assets/$f" > "$OUT/$f"
  else cp "$TEMPLATE_DIR/content/assets/$f" "$OUT/$f"; fi
done
echo "assets ${REF:-working tree} -> $OUT"
