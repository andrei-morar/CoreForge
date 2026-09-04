#!/bin/bash

# ==============================================================================
# Nexus AI Studio 2026 - Startup Script
# ==============================================================================

# Note: Make sure your GEMINI_API_KEY is exported in your environment or set it here:
# export GEMINI_API_KEY="your-api-key"

echo "🚀 Starting Nexus AI Studio 2026..."

# 1. Start the FastAPI backend
echo "⏳ Starting FastAPI Backend (Port 8000)..."
cd /home/andrei-morar/AiAgents
source agent_env/bin/activate
python main.py > backend.log 2>&1 &
BACKEND_PID=$!

# 2. Start the Next.js frontend
echo "⏳ Starting Next.js Frontend (Port 3000)..."
cd /home/andrei-morar/AiAgents/ai-dashboard
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a few seconds for services to start
sleep 4
echo ""
echo "✅ Nexus AI Studio 2026 is running!"
echo "👉 Open your browser to: http://localhost:3000"
echo "📄 Logs are being saved to backend.log and ai-dashboard/frontend.log"
echo ""
echo "🛑 Press Ctrl+C to stop both servers."

# Handle graceful shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down Nexus AI Studio..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "✅ Shutdown complete. Goodbye!"
    exit 0
}

# Trap Ctrl+C (SIGINT) and termination (SIGTERM)
trap cleanup SIGINT SIGTERM

# Keep script running to keep background jobs alive and wait for Ctrl+C
wait $BACKEND_PID $FRONTEND_PID
