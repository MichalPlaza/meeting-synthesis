import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, UTC
from bson import ObjectId

from app.apis.v1.endpoints_users import get_user_me, get_users
from app.schemas.user_schema import UserResponse
from app.models.py_object_id import PyObjectId
from app.models.user import UserRole


class TestUserEndpoints:

    def setup_method(self):
        self.mock_user = UserResponse(
            _id=PyObjectId(),
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            role=UserRole.DEVELOPER,
            is_approved=True,
            can_edit=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )

    @pytest.mark.asyncio
    async def test_get_user_me_success(self):
        result = await get_user_me(current_user=self.mock_user)
        assert result.username == "testuser"
        assert result.email == "test@example.com"

    @pytest.mark.asyncio
    async def test_get_users_success(self):
        fake_users = [
            UserResponse(
                _id=PyObjectId(),
                username="user1",
                email="user1@example.com",
                full_name="User One",
                role=UserRole.DEVELOPER,
                is_approved=True,
                can_edit=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            ),
            UserResponse(
                _id=PyObjectId(),
                username="user2",
                email="user2@example.com",
                full_name="User Two",
                role=UserRole.DEVELOPER,
                is_approved=True,
                can_edit=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC)
            )
        ]

        with patch(
                "app.crud.crud_users.get_all_users",
                new_callable=AsyncMock,
                return_value=fake_users
        ) as mock_get_all:
            result = await get_users(database=AsyncMock())
            assert len(result) == 2
            assert result[0].username == "user1"
            assert result[1].username == "user2"
            mock_get_all.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_users_empty_list(self):
        with patch(
                "app.crud.crud_users.get_all_users",
                new_callable=AsyncMock,
                return_value=[]
        ) as mock_get_all:
            result = await get_users(database=AsyncMock())
            assert result == []
            mock_get_all.assert_awaited_once()
