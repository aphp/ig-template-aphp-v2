#!/usr/bin/env bash
# Construit un IG FHIR avec la version locale de ce template.
# Usage : tests/scripts/build-ig.sh <chemin-ig> [args publisher...]
# Le publisher exige un template local situé SOUS la racine de l'IG :
# on copie donc le template dans <ig>/.local-template et on utilise un
# ig-local.ini (non suivi) pour ne pas modifier le ig.ini de l'IG.
set -euo pipefail
TEMPLATE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
IG_DIR="$(cd "$1" && pwd)"; shift
rm -rf "$IG_DIR/.local-template"
mkdir -p "$IG_DIR/.local-template"
for item in content includes package package-list.json ig.ini; do
  [ -e "$TEMPLATE_DIR/$item" ] && cp -r "$TEMPLATE_DIR/$item" "$IG_DIR/.local-template/"
done
IG_RES=$(sed -n 's/^ig *= *//p' "$IG_DIR/ig.ini")
printf '[IG]\nig = %s\ntemplate = #.local-template\n' "$IG_RES" > "$IG_DIR/ig-local.ini"
cd "$IG_DIR"
# Le publisher renvoie 0 même en cas d'échec : on détecte l'échec dans sa sortie.
LOG="$(mktemp)"
java -Xmx6g -jar input-cache/publisher.jar -ig ig-local.ini -no-sushi "$@" 2>&1 | tee "$LOG"
if grep -q "Publishing Content Failed" "$LOG" || ! grep -q "Finished @" "$LOG"; then
  rm -f "$LOG"; echo "ECHEC du build de $IG_DIR" >&2; exit 1
fi
rm -f "$LOG"
