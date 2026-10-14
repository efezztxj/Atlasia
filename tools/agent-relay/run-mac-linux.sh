#!/bin/bash
# ============================================================================
#  Agent Relay — kurulumsuz çalıştırıcı (macOS / Linux)
#  Node.js yoksa bu klasöre taşınabilir (portable) Node indirir, sonra paneli açar.
#  İlk çalıştırmada ~30 MB indirir, sonrasında beklemez.
#  macOS: ilk sefer sağ tık → Aç   ·   Linux: chmod +x run-mac-linux.sh
# ============================================================================
cd "$(dirname "$0")" || exit 1
set -e

NODE_BIN=""

# 1) Sistemde kurulu Node var mı?
if command -v node >/dev/null 2>&1; then
  MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
  if [ "$MAJOR" -ge 22 ]; then NODE_BIN="node"; fi
fi

# 2) Klasördeki taşınabilir sürüm
if [ -z "$NODE_BIN" ]; then
  for dir in runtime/node-*/bin; do
    [ -x "$dir/node" ] && NODE_BIN="$PWD/$dir/node" && break
  done
fi

# 3) İndir
if [ -z "$NODE_BIN" ]; then
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  case "$ARCH" in arm64|aarch64) ARCH=arm64 ;; *) ARCH=x64 ;; esac
  case "$OS" in darwin) PLATFORM=darwin ;; linux) PLATFORM=linux ;; *) echo "  Desteklenmeyen sistem: $OS"; exit 1 ;; esac

  echo ""
  echo "  Node.js bulunamadı, taşınabilir sürüm indiriliyor… (bir kerelik, ~30 MB)"
  echo ""
  if ! command -v curl >/dev/null 2>&1; then
    echo "  curl yok. Node 22 LTS kur: https://nodejs.org"
    exit 1
  fi

  VERSION=$(curl -fsSL https://nodejs.org/dist/index.json | python3 -c "import json,sys;v=[r['version'] for r in json.load(sys.stdin) if r['version'].startswith('v22.')];print(v[0])" 2>/dev/null || true)
  if [ -z "$VERSION" ]; then
    echo "  Sürüm listesi alınamadı. Node 22 LTS kur: https://nodejs.org"
    exit 1
  fi

  NAME="node-$VERSION-$PLATFORM-$ARCH"
  echo "   indiriliyor: $NAME"
  mkdir -p runtime
  curl -fL# "https://nodejs.org/dist/$VERSION/$NAME.tar.gz" -o "runtime/$NAME.tar.gz"
  tar -xzf "runtime/$NAME.tar.gz" -C runtime
  rm -f "runtime/$NAME.tar.gz"
  NODE_BIN="$PWD/runtime/$NAME/bin/node"
  echo "   tamam."
fi

echo ""
echo "  Agent Relay başlatılıyor → http://localhost:8787"
echo "  Kapatmak için Ctrl+C."
echo ""

"$NODE_BIN" server.mjs &
SERVER=$!
sleep 1.5
(command -v open >/dev/null 2>&1 && open "http://localhost:8787" >/dev/null 2>&1) || \
(command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:8787" >/dev/null 2>&1) || true
wait $SERVER
