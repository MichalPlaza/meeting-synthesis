import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, UTC
from bson import ObjectId

from fastapi import HTTPException
from app.services import user_service
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, Token
from app.models.user import UserRole


@pytest.mark.asyncio
class TestUserService:

    async def test_register_new_user_success(self):
        db_mock = AsyncMock()
        user_data = UserCreate(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            password="password123"
        )

        created_user_mock = MagicMock()
        created_user_mock.id = str(ObjectId())
        created_user_mock.username = user_data.username
        created_user_mock.email = user_data.email
        created_user_mock.full_name = user_data.full_name
        created_user_mock.role = UserRole.DEVELOPER
        created_user_mock.manager_id = None
        created_user_mock.is_approved = True
        created_user_mock.can_edit = True
        created_user_mock.created_at = datetime.now(UTC)
        created_user_mock.updated_at = datetime.now(UTC)

        with patch("app.services.user_service.crud_users.get_user_by_email", new=AsyncMock(return_value=None)), \
                patch("app.services.user_service.crud_users.get_user_by_username", new=AsyncMock(return_value=None)), \
                patch("app.services.user_service.crud_users.create_user",
                      new=AsyncMock(return_value=created_user_mock)):
            result = await user_service.register_new_user(db_mock, user_data)

        assert isinstance(result, UserResponse)
        assert result.username == user_data.username
        assert result.email == user_data.email

    async def test_register_new_user_email_exists(self):
        db_mock = AsyncMock()
        user_data = UserCreate(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            password="password123"
        )

        with patch("app.services.user_service.crud_users.get_user_by_email", new=AsyncMock(return_value=MagicMock())):
            with pytest.raises(HTTPException) as exc_info:
                await user_service.register_new_user(db_mock, user_data)
            assert exc_info.value.status_code == 400
            assert "email" in exc_info.value.detail.lower()

    async def test_register_new_user_username_exists(self):
        db_mock = AsyncMock()
        user_data = UserCreate(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            password="password123"
        )

        with patch("app.services.user_service.crud_users.get_user_by_email", new=AsyncMock(return_value=None)), \
                patch("app.services.user_service.crud_users.get_user_by_username",
                      new=AsyncMock(return_value=MagicMock())):
            with pytest.raises(HTTPException) as exc_info:
                await user_service.register_new_user(db_mock, user_data)
            assert exc_info.value.status_code == 400
            assert "username" in exc_info.value.detail.lower()

    async def test_authenticate_user_success_with_remember_me(self):
        db_mock = AsyncMock()
        form_data = UserLogin(username_or_email="test@example.com", password="password123", remember_me=True)

        user_mock = MagicMock()
        user_mock.username = "testuser"
        user_mock.email = "test@example.com"
        user_mock.hashed_password = "hashed_password"

        with patch("app.services.user_service.crud_users.get_user_by_username_or_email", new=AsyncMock(return_value=user_mock)), \
                patch("app.services.user_service.verify_password", return_value=True), \
                patch("app.services.user_service.create_access_token", return_value="access123"), \
                patch("app.services.user_service.create_refresh_token", return_value="refresh123"):
            result = await user_service.authenticate_user(db_mock, form_data)

        assert isinstance(result, Token)
        assert result.access_token == "access123"
        assert result.refresh_token == "refresh123"
        assert result.token_type == "bearer"

    async def test_authenticate_user_success_without_remember_me(self):
        db_mock = AsyncMock()
        form_data = UserLogin(username_or_email="test@example.com", password="password123", remember_me=False)

        user_mock = MagicMock()
        user_mock.username = "testuser"
        user_mock.email = "test@example.com"
        user_mock.hashed_password = "hashed_password"

        with patch("app.services.user_service.crud_users.get_user_by_username_or_email", new=AsyncMock(return_value=user_mock)), \
                patch("app.services.user_service.verify_password", return_value=True), \
                patch("app.services.user_service.create_access_token", return_value="access123"), \
                patch("app.services.user_service.create_refresh_token", return_value="refresh123"):
            result = await user_service.authenticate_user(db_mock, form_data)

        assert isinstance(result, Token)
        assert result.access_token == "access123"
        assert result.refresh_token is None
        assert result.token_type == "bearer"

    async def test_authenticate_user_invalid_credentials(self):
        db_mock = AsyncMock()
        form_data = UserLogin(username_or_email="wrong@example.com", password="wrongpass", remember_me=False)

        with patch("app.services.user_service.crud_users.get_user_by_username_or_email", new=AsyncMock(return_value=None)):
            with pytest.raises(HTTPException) as exc_info:
                await user_service.authenticate_user(db_mock, form_data)
            assert exc_info.value.status_code == 401
            assert "wrong" in exc_info.value.detail.lower()

    async def test_authenticate_user_wrong_password(self):
        db_mock = AsyncMock()
        form_data = UserLogin(username_or_email="test@example.com", password="wrongpass", remember_me=False)

        user_mock = MagicMock()
        user_mock.username = "testuser"
        user_mock.email = "test@example.com"
        user_mock.hashed_password = "correct_hashed_password"

        with patch("app.services.user_service.crud_users.get_user_by_username_or_email", new=AsyncMock(return_value=user_mock)), \
                patch("app.services.user_service.verify_password", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await user_service.authenticate_user(db_mock, form_data)
            assert exc_info.value.status_code == 401
            assert "wrong" in exc_info.value.detail.lower()
