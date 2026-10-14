#!/bin/bash
# Agent Relay — Linux başlatıcı.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js bulunamadı. Kur: sudo apt install nodejs npm  (ya da https://nodejs.org, 22+)"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "  Node sürümün $NODE_MAJOR — en az 22 gerekiyor (https://nodejs.org)."
  exit 1
fi

echo ""
echo "  Agent Relay başlatılıyor → http://localhost:8787"
echo "  Kapatmak için Ctrl+C."
echo ""

node server.mjs &
SERVER=$!
sleep 1.5
(command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:8787" >/dev/null 2>&1) || true
wait $SERVER
