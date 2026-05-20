#!/bin/bash

echo "Starting Asset Correlation Monitor..."

# Start Backend
echo "Starting FastAPI Backend..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8012 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Next.js Frontend..."
cd frontend
npm run dev -- -p 3012 &
FRONTEND_PID=$!
cd ..

echo "Both servers are running."
echo "Frontend: http://localhost:3012"
echo "Backend API: http://localhost:8012/api/v1/health"
echo "Press Ctrl+C to stop both servers."

# Wait for user interrupt
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
