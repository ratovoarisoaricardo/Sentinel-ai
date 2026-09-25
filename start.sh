#!/usr/bin/env bash
set -e
echo "=== Sentinel AI (Linux / macOS) ==="
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi
python app.py &
BACKEND_PID=$!
cd ..

cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait