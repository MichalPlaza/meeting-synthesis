"""Unit tests for auth endpoints."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.apis.v1.endpoints_auth import (
    refresh_access_token,
)
from app.models.py_object_id import PyObjectId
from app.schemas.user_schema import (
    UserCreate,
    UserLogin,
    RefreshTokenRequest,
    Token,
    UserResponse,
)


@pytest.mark.asyncio
class TestAuthEndpoints:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    # ---------------- REGISTER USER ----------------
    async def test_register_user_success(self):
        """Test successful user registration via TestClient."""
        from app.models.user import UserRole
        from app.main import app

        fake_response = UserResponse(
            _id=PyObjectId(),
            username="newuser",
            email="new@example.com",
            full_name="New User",
            role=UserRole.DEVELOPER,
            is_approved=False,
            can_edit=True,
            created_at="2025-01-01T00:00:00",
            updated_at="2025-01-01T00:00:00"
        )

        with patch("app.apis.v1.endpoints_auth.user_service.register_new_user", new_callable=AsyncMock) as mock_register, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_register.return_value = fake_response

            client = TestClient(app)
            response = client.post(
                "/auth/register",
                json={
                    "username": "newuser",
                    "email": "new@example.com",
                    "password": "pass123",
                    "full_name": "New User"
                }
            )

            assert response.status_code == 201
            data = response.json()
            assert data["username"] == "newuser"
            mock_register.assert_awaited_once()

    async def test_register_user_existing_username(self):
        """Test registration fails when username exists."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.register_new_user", new_callable=AsyncMock) as mock_register, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_register.side_effect = HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

            client = TestClient(app)
            response = client.post(
                "/auth/register",
                json={
                    "username": "taken",
                    "email": "taken@example.com",
                    "password": "pass123"
                }
            )

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Username already exists" in response.json()["detail"]

    # ---------------- LOGIN ----------------
    async def test_login_success(self):
        """Test successful login via TestClient."""
        from app.main import app

        fake_token = Token(access_token="fake.jwt.token", token_type="bearer")

        with patch("app.apis.v1.endpoints_auth.user_service.authenticate_user", new_callable=AsyncMock) as mock_auth, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_auth.return_value = fake_token

            client = TestClient(app)
            response = client.post(
                "/auth/login",
                json={
                    "username_or_email": "testuser",
                    "password": "validpass"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["access_token"] == "fake.jwt.token"
            assert data["token_type"] == "bearer"
            mock_auth.assert_awaited_once()

    async def test_login_invalid_credentials(self):
        """Test login returns 401 when credentials are invalid."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.authenticate_user", new_callable=AsyncMock) as mock_auth, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            # When credentials are invalid, authenticate_user should raise HTTPException
            mock_auth.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong username or password"
            )

            client = TestClient(app)
            response = client.post(
                "/auth/login",
                json={
                    "username_or_email": "testuser",
                    "password": "wrongpass"
                }
            )

            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Wrong" in response.json()["detail"]
            mock_auth.assert_awaited_once()

    async def test_login_service_raises_exception(self):
        """Test login returns 401 when service raises HTTPException."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.authenticate_user", new_callable=AsyncMock) as mock_auth, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_auth.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

            client = TestClient(app)
            response = client.post(
                "/auth/login",
                json={
                    "username_or_email": "testuser",
                    "password": "oops"
                }
            )

            assert response.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid credentials" in response.json()["detail"]

    # ---------------- REFRESH TOKEN ----------------
    async def test_refresh_token_success(self):
        fake_user = MagicMock(username="validuser", email="valid@example.com")

        with (
            patch("app.apis.v1.endpoints_auth.security.decode_token", return_value=MagicMock(username="validuser")),
            patch("app.apis.v1.endpoints_auth.crud_users.get_user_by_username", new_callable=AsyncMock) as mock_get_user,
            patch("app.apis.v1.endpoints_auth.security.create_access_token", return_value="new.jwt.token"),
        ):
            mock_get_user.return_value = fake_user
            request = RefreshTokenRequest(refresh_token="valid_refresh")
            result = await refresh_access_token(request, database=self.mock_db)
            assert isinstance(result, Token)
            assert result.access_token == "new.jwt.token"
            assert result.token_type == "bearer"
            mock_get_user.assert_awaited_once()

    async def test_refresh_token_invalid_decoded_data(self):
        with patch("app.apis.v1.endpoints_auth.security.decode_token", return_value=None):
            request = RefreshTokenRequest(refresh_token="invalid")
            with pytest.raises(HTTPException) as exc:
                await refresh_access_token(request, database=self.mock_db)
            assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid refresh token" in str(exc.value.detail)

    async def test_refresh_token_no_username_in_token(self):
        fake_decoded = MagicMock()
        fake_decoded.username = None
        with patch("app.apis.v1.endpoints_auth.security.decode_token", return_value=fake_decoded):
            request = RefreshTokenRequest(refresh_token="valid_but_no_username")
            with pytest.raises(HTTPException) as exc:
                await refresh_access_token(request, database=self.mock_db)
            assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid refresh token" in str(exc.value.detail)

    async def test_refresh_token_user_not_found(self):
        with (
            patch("app.apis.v1.endpoints_auth.security.decode_token", return_value=MagicMock(username="ghost")),
            patch("app.apis.v1.endpoints_auth.crud_users.get_user_by_username", new_callable=AsyncMock) as mock_get_user,
        ):
            mock_get_user.return_value = None
            request = RefreshTokenRequest(refresh_token="valid_but_user_missing")
            with pytest.raises(HTTPException) as exc:
                await refresh_access_token(request, database=self.mock_db)
            assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "User not found" in str(exc.value.detail)
