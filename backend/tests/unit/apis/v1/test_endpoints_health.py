"""Unit tests for health check endpoints."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.db.mongodb_utils import get_database


@pytest.fixture
def mock_database():
    """Create a mock database that responds to commands."""
    db = AsyncMock()
    db.command = AsyncMock(return_value={"ok": 1})
    return db


@pytest.fixture
async def client(mock_database):
    """Create test client with mocked database."""
    async def override_get_database():
        return mock_database

    app.dependency_overrides[get_database] = override_get_database

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.clear()


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_basic_health_check(self, client):
        """Test basic health endpoint returns ok status."""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_liveness_check(self, client):
        """Test liveness probe returns alive status."""
        response = await client.get("/health/live")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"

    @pytest.mark.asyncio
    async def test_readiness_check_healthy(self, client, mock_database):
        """Test readiness probe when MongoDB is healthy."""
        response = await client.get("/health/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        mock_database.command.assert_called_once_with("ping")

    @pytest.mark.asyncio
    async def test_readiness_check_unhealthy(self, client, mock_database):
        """Test readiness probe when MongoDB fails."""
        mock_database.command.side_effect = Exception("MongoDB connection failed")

        response = await client.get("/health/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "not_ready"
        assert "error" in data

    @pytest.mark.asyncio
    async def test_detailed_health_all_healthy(self, client, mock_database):
        """Test detailed health check when all services are healthy."""
        with patch("app.apis.v1.endpoints_health.get_elasticsearch_client") as mock_es, \
             patch("app.apis.v1.endpoints_health.get_redis_client") as mock_redis:

            # Mock Elasticsearch
            es_client = AsyncMock()
            es_client.ping = AsyncMock(return_value=True)
            es_client.close = AsyncMock()
            mock_es.return_value = es_client

            # Mock Redis
            redis_client = AsyncMock()
            redis_client.ping = AsyncMock(return_value=True)
            mock_redis.return_value = redis_client

            response = await client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["checks"]["mongodb"]["status"] == "healthy"
            assert data["checks"]["elasticsearch"]["status"] == "healthy"
            assert data["checks"]["redis"]["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_detailed_health_mongodb_unhealthy(self, client, mock_database):
        """Test detailed health check when MongoDB is unhealthy."""
        mock_database.command.side_effect = Exception("MongoDB down")

        with patch("app.apis.v1.endpoints_health.get_elasticsearch_client") as mock_es, \
             patch("app.apis.v1.endpoints_health.get_redis_client") as mock_redis:

            es_client = AsyncMock()
            es_client.ping = AsyncMock(return_value=True)
            es_client.close = AsyncMock()
            mock_es.return_value = es_client

            redis_client = AsyncMock()
            redis_client.ping = AsyncMock(return_value=True)
            mock_redis.return_value = redis_client

            response = await client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["checks"]["mongodb"]["status"] == "unhealthy"
            assert "error" in data["checks"]["mongodb"]

    @pytest.mark.asyncio
    async def test_detailed_health_elasticsearch_unhealthy(self, client, mock_database):
        """Test detailed health check when Elasticsearch is unhealthy."""
        with patch("app.apis.v1.endpoints_health.get_elasticsearch_client") as mock_es, \
             patch("app.apis.v1.endpoints_health.get_redis_client") as mock_redis:

            es_client = AsyncMock()
            es_client.ping = AsyncMock(side_effect=Exception("ES connection failed"))
            es_client.close = AsyncMock()
            mock_es.return_value = es_client

            redis_client = AsyncMock()
            redis_client.ping = AsyncMock(return_value=True)
            mock_redis.return_value = redis_client

            response = await client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["checks"]["elasticsearch"]["status"] == "unhealthy"

    @pytest.mark.asyncio
    async def test_detailed_health_redis_unhealthy(self, client, mock_database):
        """Test detailed health check when Redis is unhealthy."""
        with patch("app.apis.v1.endpoints_health.get_elasticsearch_client") as mock_es, \
             patch("app.apis.v1.endpoints_health.get_redis_client") as mock_redis:

            es_client = AsyncMock()
            es_client.ping = AsyncMock(return_value=True)
            es_client.close = AsyncMock()
            mock_es.return_value = es_client

            redis_client = AsyncMock()
            redis_client.ping = AsyncMock(side_effect=Exception("Redis connection failed"))
            mock_redis.return_value = redis_client

            response = await client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["checks"]["redis"]["status"] == "unhealthy"

    @pytest.mark.asyncio
    async def test_detailed_health_includes_version(self, client, mock_database):
        """Test detailed health check includes version information."""
        with patch("app.apis.v1.endpoints_health.get_elasticsearch_client") as mock_es, \
             patch("app.apis.v1.endpoints_health.get_redis_client") as mock_redis:

            es_client = AsyncMock()
            es_client.ping = AsyncMock(return_value=True)
            es_client.close = AsyncMock()
            mock_es.return_value = es_client

            redis_client = AsyncMock()
            redis_client.ping = AsyncMock(return_value=True)
            mock_redis.return_value = redis_client

            response = await client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert "version" in data
