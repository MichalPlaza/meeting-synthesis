import pytest
import mongomock
from httpx import AsyncClient, ASGITransport
from typing import AsyncGenerator
from unittest.mock import AsyncMock

# Ten import zadziała, gdy PYTHONPATH będzie poprawnie ustawiony
from app.main import app
from app.db.mongodb_utils import get_database

@pytest.fixture(scope="function")
def db():
    return mongomock.MongoClient().db

@pytest.fixture(scope="function")
def db_mock():
    """Mock database for testing."""
    return AsyncMock()

@pytest.fixture(scope="function")
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_database():
        return db

    app.dependency_overrides[get_database] = override_get_database
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def auth_headers() -> dict:
    """Mock authentication headers for testing."""
    # In real tests, you'd generate a proper JWT token
    # For now, we'll use a mock token
    return {
        "Authorization": "Bearer mock_token_for_testing"
    }