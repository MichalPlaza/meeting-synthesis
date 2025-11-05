#!/bin/bash

# Meeting Synthesis - Run All Services Locally
# Simple script to start the entire application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Create logs directory
mkdir -p logs

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Meeting Synthesis - Starting Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}❌ Python3 not found${NC}"; exit 1; }
command -v poetry >/dev/null 2>&1 || { echo -e "${RED}❌ Poetry not found${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js not found${NC}"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}❌ pnpm not found${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not found${NC}"; exit 1; }
echo -e "${GREEN}✅ All prerequisites installed${NC}"
echo ""

# Start Redis via Homebrew
echo -e "${BLUE}🔴 Starting Redis...${NC}"
brew services start redis 2>/dev/null || echo -e "${YELLOW}⚠️  Redis may already be running${NC}"
sleep 2
echo -e "${GREEN}✅ Redis ready${NC}"
echo ""

# Start Docker services
echo -e "${BLUE}🐳 Starting Docker services (MongoDB, Elasticsearch, Ollama)...${NC}"
docker-compose up -d mongo elasticsearch ollama
sleep 5
echo -e "${GREEN}✅ Docker services ready${NC}"
echo ""

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
poetry install --no-interaction --quiet 2>/dev/null || poetry install
cd ..
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend
pnpm install --silent 2>&1 | grep -v "Update available" || true
cd ..
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

# Start all services
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Starting all services...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Backend:             http://localhost:8000${NC}"
echo -e "${YELLOW}API Docs:            http://localhost:8000/docs${NC}"
echo -e "${YELLOW}Frontend:            http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}🛑 Stopping all services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    echo -e "${YELLOW}Note: Docker services (mongo, elasticsearch, ollama) and Redis are still running${NC}"
    echo -e "${YELLOW}To stop them: 'make stop'${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "${BLUE}🚀 Starting backend services...${NC}"

# Start backend with PYTHON_ENV=development and verbose logging
cd backend
echo -e "${GREEN}  → Starting FastAPI backend on port 8000${NC}"
PYTHON_ENV=development poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}  ✓ Backend started (PID: $BACKEND_PID)${NC}"
cd ..

# Start Celery worker
cd backend
echo -e "${YELLOW}  → Starting Celery worker with -P solo${NC}"
poetry run celery -A app.worker.celery_app worker --loglevel=info -P solo > ../logs/celery_worker.log 2>&1 &
CELERY_WORKER_PID=$!
echo -e "${YELLOW}  ✓ Celery worker started (PID: $CELERY_WORKER_PID)${NC}"
cd ..

# Start Celery beat
cd backend
echo -e "${YELLOW}  → Starting Celery beat scheduler${NC}"
poetry run celery -A app.worker.celery_app beat --loglevel=info > ../logs/celery_beat.log 2>&1 &
CELERY_BEAT_PID=$!
echo -e "${YELLOW}  ✓ Celery beat started (PID: $CELERY_BEAT_PID)${NC}"
cd ..

# Start frontend
echo -e "${BLUE}  → Starting frontend on port 3000${NC}"
cd frontend
pnpm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${BLUE}  ✓ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ..

# Wait a moment for services to start
echo ""
echo -e "${BLUE}⏳ Waiting for services to initialize...${NC}"
sleep 3

echo ""
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "${GREEN}  Backend:       Running on http://localhost:8000 (PID: $BACKEND_PID)${NC}"
echo -e "${YELLOW}  Celery Worker: Running (PID: $CELERY_WORKER_PID)${NC}"
echo -e "${YELLOW}  Celery Beat:   Running (PID: $CELERY_BEAT_PID)${NC}"
echo -e "${BLUE}  Frontend:      Running on http://localhost:3000 (PID: $FRONTEND_PID)${NC}"
echo ""
echo -e "${BLUE}📋 Showing logs from all services...${NC}"
echo -e "${YELLOW}(Press Ctrl+C to stop)${NC}"
echo ""

# Tail all logs in parallel with prefixes
tail -f logs/backend.log 2>/dev/null | sed "s/^/$(echo -e '\033[0;32m')[BACKEND]$(echo -e '\033[0m') /" &
tail -f logs/celery_worker.log 2>/dev/null | sed "s/^/$(echo -e '\033[0;33m')[CELERY_WORKER]$(echo -e '\033[0m') /" &
tail -f logs/celery_beat.log 2>/dev/null | sed "s/^/$(echo -e '\033[0;35m')[CELERY_BEAT]$(echo -e '\033[0m') /" &
tail -f logs/frontend.log 2>/dev/null | sed "s/^/$(echo -e '\033[0;36m')[FRONTEND]$(echo -e '\033[0m') /" &

# Wait for Ctrl+C
wait
