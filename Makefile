.PHONY: run stop run-redis run-mongo

run: run-redis run-mongo
	@echo "Starting all services..."
	@chmod +x scripts/run_backend.sh
	@chmod +x scripts/run_frontend.sh
	@chmod +x scripts/run_notification_service.sh
	@chmod +x scripts/run_celery_worker.sh
	@./scripts/run_backend.sh & \
	./scripts/run_frontend.sh & \
	./scripts/run_notification_service.sh & \
	./scripts/run_celery_worker.sh &
	@echo "All services are running in the background."

run-redis:
	@echo "Starting Redis..."
	@chmod +x scripts/run_redis.sh
	@./scripts/run_redis.sh &

run-mongo:
	@echo "Starting MongoDB..."
	@chmod +x scripts/run_mongo.sh
	@./scripts/run_mongo.sh &

stop:
	@echo "Stopping all services..."
	@pkill -f "uvicorn app.main:app"
	@pkill -f "pnpm run dev"
	@pkill -f "celery -A app.worker.celery_app worker"
	@redis-cli shutdown
	@mongod --dbpath ./mongo_data --shutdown
	@echo "All services stopped."
