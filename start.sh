#!/bin/bash

# 🐾 PawHub Unified Startup Script

echo "🚀 Starting PawHub Ecosystem..."

# Function to handle cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT SIGTERM

# 1. Start Node.js Auth Service
echo "🔑 Starting Auth Service (Node.js)..."
cd auth_service_node
npm start &
cd ..

# 2. Start Django Backend
echo "⚙️ Starting Backend (Django)..."
cd backend
source .venv/bin/activate
python manage.py runserver &
cd ..

# 3. Start React Frontend
echo "💻 Starting Frontend (React/Vite)..."
cd frontend
npm run dev &
cd ..

echo "✅ All services are starting up!"
echo "🔗 Frontend: http://localhost:5173"
echo "🔗 Backend: http://localhost:8000"
echo "🔗 Auth Service: http://localhost:5001"

# Keep the script running to maintain background processes
wait
