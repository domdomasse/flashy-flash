#!/bin/bash
# Flashmob Admin — Lance le serveur et ouvre le navigateur (macOS)

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8090
URL="http://localhost:$PORT"

# Si le serveur tourne déjà, juste ouvrir le navigateur
if curl -s "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

echo ""
echo "  Flashmob Admin"
echo "  $URL"
echo "  Ctrl+C pour arrêter"
echo ""

(sleep 1 && open "$URL") &
python3 "$DIR/server.py"
