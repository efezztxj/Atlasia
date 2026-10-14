#!/bin/bash
# Agent Relay — macOS başlatıcı. Çift tıklayabilirsin (önce: chmod +x start-mac.command)
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js bulunamadı."
  echo "  https://nodejs.org adresinden LTS sürümünü kur (22 veya üstü), sonra bunu tekrar çalıştır."
  echo ""
  read -n 1 -s -r -p "  Kapatmak için bir tuşa bas…"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "  Node sürümün $NODE_MAJOR — en az 22 gerekiyor. https://nodejs.org"
  read -n 1 -s -r -p "  Kapatmak için bir tuşa bas…"
  exit 1
fi

echo ""
echo "  Agent Relay başlatılıyor → http://localhost:8787"
echo "  Kapatmak için bu pencereyi kapat ya da Ctrl+C."
echo ""

node server.mjs &
SERVER=$!
sleep 1.5
open "http://localhost:8787" >/dev/null 2>&1
wait $SERVER
