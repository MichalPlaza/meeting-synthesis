.PHONY: run stop clean test help

.DEFAULT_GOAL := help

help:
	@echo "=========================================="
	@echo "Meeting Synthesis - Makefile Commands"
	@echo "=========================================="
	@echo ""
	@echo "  make run    - Start all services locally"
	@echo "  make stop   - Stop all services"
	@echo "  make clean  - Clean logs and temp files"
	@echo "  make test   - Run backend tests"
	@echo ""

run:
	@chmod +x scripts/run.sh
	@./scripts/run.sh

stop:
	@echo "🛑 Stopping all services..."
	@pkill -f "uvicorn app.main:app" || true
	@pkill -f "celery -A app.worker.celery_app worker" || true
	@pkill -f "celery -A app.worker.celery_app beat" || true
	@pkill -f "notification_service" || true
	@pkill -f "vite" || true
	@docker-compose down
	@brew services stop redis 2>/dev/null || true
	@echo "✅ All services stopped"

clean:
	@echo "🧹 Cleaning up..."
	@rm -rf logs/*.log
	@rm -rf backend/__pycache__
	@rm -rf backend/.pytest_cache
	@rm -rf backend/.ruff_cache
	@rm -rf frontend/dist
	@rm -rf frontend/node_modules/.cache
	@echo "✅ Cleanup complete"

test:
	@echo "🧪 Running backend tests..."
	@cd backend && poetry run pytest
