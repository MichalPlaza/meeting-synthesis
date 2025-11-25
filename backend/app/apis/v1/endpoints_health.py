"""Health check endpoints.

Provides health status endpoints for monitoring and orchestration systems.
"""

import os
import logging
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...core.elasticsearch_config import get_elasticsearch_client
from ...core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns a simple OK status. Use /health/detailed for comprehensive checks.
    """
    return {"status": "ok"}


@router.get("/health/detailed")
async def detailed_health_check(
    database: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Detailed health check with dependency status.

    Checks connectivity to:
    - MongoDB
    - Elasticsearch
    - Redis

    Returns:
        Health status for each dependency and overall status.
    """
    checks = {}

    # MongoDB check
    try:
        await database.command("ping")
        checks["mongodb"] = {"status": "healthy"}
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        checks["mongodb"] = {"status": "unhealthy", "error": str(e)}

    # Elasticsearch check
    es_client = None
    try:
        es_client = get_elasticsearch_client()
        if await es_client.ping():
            checks["elasticsearch"] = {"status": "healthy"}
        else:
            checks["elasticsearch"] = {"status": "unhealthy", "error": "Ping failed"}
    except Exception as e:
        logger.error(f"Elasticsearch health check failed: {e}")
        checks["elasticsearch"] = {"status": "unhealthy", "error": str(e)}
    finally:
        if es_client:
            await es_client.close()

    # Redis check
    try:
        redis_client = get_redis_client()
        await redis_client.ping()
        checks["redis"] = {"status": "healthy"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        checks["redis"] = {"status": "unhealthy", "error": str(e)}

    # Determine overall status
    all_healthy = all(check["status"] == "healthy" for check in checks.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "version": os.getenv("APP_VERSION", "dev"),
    }


@router.get("/health/ready")
async def readiness_check(
    database: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Readiness probe for Kubernetes/container orchestration.

    Returns 200 only if the service is ready to accept traffic.
    """
    try:
        # Check MongoDB - critical dependency
        await database.command("ping")
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {"status": "not_ready", "error": str(e)}


@router.get("/health/live")
async def liveness_check():
    """
    Liveness probe for Kubernetes/container orchestration.

    Returns 200 if the service process is running.
    """
    return {"status": "alive"}
