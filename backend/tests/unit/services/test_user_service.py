import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta, UTC
from bson import ObjectId

from fastapi import HTTPException
from app.services import user_service
from app.services.user_service import user_to_response
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, Token
from app.models.user import UserRole, User


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


class TestUserToResponse:
    """Tests for user_to_response helper function."""

    def test_converts_user_to_response(self):
        """Test successful conversion of User to UserResponse."""
        user_id = ObjectId()
        manager_id = ObjectId()
        created_at = datetime.now(UTC)
        updated_at = datetime.now(UTC)

        user = User(
            id=user_id,
            username="testuser",
            email="test@example.com",
            hashed_password="hashed123",
            full_name="Test User",
            role="developer",
            manager_id=manager_id,
            is_approved=True,
            can_edit=True,
            created_at=created_at,
            updated_at=updated_at,
        )

        result = user_to_response(user)

        assert isinstance(result, UserResponse)
        assert result.id == user_id
        assert result.username == "testuser"
        assert result.email == "test@example.com"
        assert result.full_name == "Test User"
        assert result.role == "developer"
        assert result.manager_id == manager_id
        assert result.is_approved is True
        assert result.can_edit is True
        assert result.created_at == created_at
        assert result.updated_at == updated_at

    def test_converts_user_with_none_values(self):
        """Test conversion with optional None values (full_name, manager_id)."""
        user_id = ObjectId()
        created_at = datetime.now(UTC)
        updated_at = datetime.now(UTC)

        user = User(
            id=user_id,
            username="minuser",
            email="min@example.com",
            hashed_password="hashed123",
            full_name=None,
            role="developer",
            manager_id=None,
            is_approved=False,
            can_edit=False,
            created_at=created_at,
            updated_at=updated_at,
        )

        result = user_to_response(user)

        assert isinstance(result, UserResponse)
        assert result.full_name is None
        assert result.manager_id is None
        assert result.created_at == created_at
        assert result.updated_at == updated_at

    def test_does_not_include_hashed_password(self):
        """Test that hashed_password is not in response."""
        user = User(
            id=ObjectId(),
            username="secureuser",
            email="secure@example.com",
            hashed_password="super_secret_hash",
            role="developer",
        )

        result = user_to_response(user)

        # UserResponse should not have hashed_password attribute
        result_dict = result.model_dump()
        assert "hashed_password" not in result_dict


@pytest.mark.asyncio
class TestPasswordReset:
    """Tests for password reset functionality."""

    async def test_create_password_reset_token_success(self):
        """Test successful password reset token creation."""
        db_mock = AsyncMock()

        user_mock = MagicMock()
        user_mock.email = "test@example.com"

        # Mock the collection operations
        collection_mock = AsyncMock()
        collection_mock.update_many = AsyncMock()
        collection_mock.insert_one = AsyncMock()
        db_mock.__getitem__ = MagicMock(return_value=collection_mock)

        with patch("app.services.user_service.crud_users.get_user_by_email",
                   new=AsyncMock(return_value=user_mock)):
            result = await user_service.create_password_reset_token(db_mock, "test@example.com")

        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 20  # Token should be reasonably long

    async def test_create_password_reset_token_nonexistent_email(self):
        """Test that nonexistent email returns None."""
        db_mock = AsyncMock()

        with patch("app.services.user_service.crud_users.get_user_by_email",
                   new=AsyncMock(return_value=None)):
            result = await user_service.create_password_reset_token(db_mock, "nonexistent@example.com")

        assert result is None

    async def test_verify_password_reset_token_success(self):
        """Test successful token verification."""
        db_mock = AsyncMock()

        token_record = {
            "email": "test@example.com",
            "token": "valid-token",
            "used": False,
            "expires_at": datetime.now(UTC) + timedelta(hours=1)
        }

        collection_mock = AsyncMock()
        collection_mock.find_one = AsyncMock(return_value=token_record)
        db_mock.__getitem__ = MagicMock(return_value=collection_mock)

        result = await user_service.verify_password_reset_token(db_mock, "valid-token")

        assert result == "test@example.com"

    async def test_verify_password_reset_token_expired(self):
        """Test that expired token returns None."""
        db_mock = AsyncMock()

        # find_one returns None for expired/invalid tokens
        collection_mock = AsyncMock()
        collection_mock.find_one = AsyncMock(return_value=None)
        db_mock.__getitem__ = MagicMock(return_value=collection_mock)

        result = await user_service.verify_password_reset_token(db_mock, "expired-token")

        assert result is None

    async def test_verify_password_reset_token_used(self):
        """Test that already used token returns None."""
        db_mock = AsyncMock()

        collection_mock = AsyncMock()
        collection_mock.find_one = AsyncMock(return_value=None)  # used=True filtered out
        db_mock.__getitem__ = MagicMock(return_value=collection_mock)

        result = await user_service.verify_password_reset_token(db_mock, "used-token")

        assert result is None

    async def test_reset_password_success(self):
        """Test successful password reset."""
        db_mock = AsyncMock()

        token_record = {
            "email": "test@example.com",
            "token": "valid-token",
            "used": False,
            "expires_at": datetime.now(UTC) + timedelta(hours=1)
        }

        # Mock collection operations
        tokens_collection = AsyncMock()
        tokens_collection.find_one = AsyncMock(return_value=token_record)
        tokens_collection.update_one = AsyncMock()

        users_collection = AsyncMock()
        users_collection.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

        def get_collection(name):
            if name == "password_reset_tokens":
                return tokens_collection
            elif name == "users":
                return users_collection
            return AsyncMock()

        db_mock.__getitem__ = MagicMock(side_effect=get_collection)

        result = await user_service.reset_password(db_mock, "valid-token", "newpassword123")

        assert result is True
        tokens_collection.update_one.assert_awaited_once()
        users_collection.update_one.assert_awaited_once()

    async def test_reset_password_invalid_token(self):
        """Test password reset with invalid token returns False."""
        db_mock = AsyncMock()

        collection_mock = AsyncMock()
        collection_mock.find_one = AsyncMock(return_value=None)
        db_mock.__getitem__ = MagicMock(return_value=collection_mock)

        result = await user_service.reset_password(db_mock, "invalid-token", "newpassword123")

        assert result is False

    async def test_reset_password_invalidates_token(self):
        """Test that password reset marks the token as used."""
        db_mock = AsyncMock()

        token_record = {
            "email": "test@example.com",
            "token": "valid-token",
            "used": False,
            "expires_at": datetime.now(UTC) + timedelta(hours=1)
        }

        tokens_collection = AsyncMock()
        tokens_collection.find_one = AsyncMock(return_value=token_record)
        tokens_collection.update_one = AsyncMock()

        users_collection = AsyncMock()
        users_collection.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

        def get_collection(name):
            if name == "password_reset_tokens":
                return tokens_collection
            elif name == "users":
                return users_collection
            return AsyncMock()

        db_mock.__getitem__ = MagicMock(side_effect=get_collection)

        await user_service.reset_password(db_mock, "valid-token", "newpassword123")

        # Verify token was marked as used
        tokens_collection.update_one.assert_awaited_once()
        call_args = tokens_collection.update_one.call_args
        assert call_args[0][0] == {"token": "valid-token"}
        assert "$set" in call_args[0][1]
        assert call_args[0][1]["$set"]["used"] is True
