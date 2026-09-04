#!/bin/bash

# ==============================================================================
# CoreForge 2026 - Startup Script (100% Local Multi-Agent IDE)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "⚡ Starting CoreForge 2026..."

# 1. Start the FastAPI backend
echo "⏳ Starting CoreForge Backend (Port 8000)..."
source agent_env/bin/activate
python main.py > backend.log 2>&1 &
BACKEND_PID=$!

# 2. Start the Next.js frontend
echo "⏳ Starting CoreForge Web IDE (Port 3000)..."
cd "$DIR/ai-dashboard"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

cd "$DIR"
sleep 3
echo ""
echo "✅ CoreForge 2026 is running!"
echo "👉 Open your browser to: http://localhost:3000"
echo "🔌 API Swagger docs:     http://localhost:8000/docs"
echo "📄 Logs saved to backend.log and ai-dashboard/frontend.log"
echo ""
echo "🛑 Press Ctrl+C to stop both servers."

cleanup() {
    echo ""
    echo "🛑 Shutting down CoreForge..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "✅ Shutdown complete. Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM
wait $BACKEND_PID $FRONTEND_PID
