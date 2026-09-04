#!/bin/bash
set -e

echo "============================================================"
echo "⚡ Nexus AI Studio 2026 - Desktop Packaging Script"
echo "============================================================"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "📦 1. Verificare dependențe desktop..."
cd desktop
if [ ! -d "node_modules" ]; then
    echo "Instalare Electron & Electron-Builder..."
    npm install
fi

echo "🚀 2. Construire pachete Linux (.deb și .AppImage)..."
npm run pack:linux

echo "✅ Compilare completă!"
echo "Pachetele generate se află în folderul: $DIR/release"
ls -lh "$DIR/release" || true
