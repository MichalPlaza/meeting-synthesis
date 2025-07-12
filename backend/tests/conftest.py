import pytest
import mongomock
from httpx import AsyncClient
from typing import AsyncGenerator

# Ten import zadziała, gdy PYTHONPATH będzie poprawnie ustawiony
from app.main import app
from app.db.mongodb_utils import get_database

@pytest.fixture(scope="function")
def db():
    return mongomock.MongoClient().db

@pytest.fixture(scope="function")
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_database():
        return db

    app.dependency_overrides[get_database] = override_get_database
    
    async with AsyncClient(app=app, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.clear()