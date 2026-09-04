#!/bin/bash
# ============================================================
# Nexus AI Studio 2026 - Push to GitHub Script
# ============================================================

set -e

echo "============================================================"
echo "⚡ Nexus AI Studio 2026 - Configurare & Push pe GitHub"
echo "============================================================"

REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
    echo "Utilizare: ./scripts/push_to_github.sh <URL_REPOSITORY_GITHUB>"
    echo "Exemplu:  ./scripts/push_to_github.sh https://github.com/andrei-morar/Nexus-AI-Studio.git"
    echo ""
    read -p "Introdu URL-ul repository-ului tău GitHub: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
    echo "❌ Eroare: Nu ai specificat URL-ul repository-ului GitHub."
    exit 1
fi

echo "🔗 1. Configurare remote 'origin'..."
if git remote | grep -q 'origin'; then
    git remote set-url origin "$REPO_URL"
else
    git remote add origin "$REPO_URL"
fi

echo "🚀 2. Împingere ramură 'main' pe GitHub..."
git push -u origin main

echo "🏷️ 3. Împingere tag 'v2.0.0' pentru a declanșa Release-ul automat (.exe & .deb)..."
git push origin v2.0.0

echo "============================================================"
echo "✅ SUCCES! Proiectul tău a fost încărcat pe GitHub!"
echo "Pipeline-ul de GitHub Actions construiește acum automat:"
echo " - Nexus AI Studio Setup (.exe) pentru Windows"
echo " - Nexus AI Studio (.deb) pentru Ubuntu"
echo "Le poți descărca din secțiunea 'Releases' a depozitului tău!"
echo "============================================================"
