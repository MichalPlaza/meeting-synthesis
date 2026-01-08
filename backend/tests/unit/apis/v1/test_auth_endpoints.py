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

    # ---------------- PASSWORD RESET REQUEST ----------------
    async def test_request_password_reset_success(self):
        """Test password reset request returns success even when email exists."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.create_password_reset_token", new_callable=AsyncMock) as mock_create, \
             patch("app.apis.v1.endpoints_auth.is_email_configured", return_value=False), \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_create.return_value = "test-reset-token"

            client = TestClient(app)
            response = client.post(
                "/auth/password-reset/request",
                json={"email": "test@example.com"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "email" in data["message"].lower() or "sent" in data["message"].lower()
            mock_create.assert_awaited_once()

    async def test_request_password_reset_nonexistent_email_still_returns_success(self):
        """Test password reset request returns success even for nonexistent email (security)."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.create_password_reset_token", new_callable=AsyncMock) as mock_create, \
             patch("app.apis.v1.endpoints_auth.is_email_configured", return_value=False), \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_create.return_value = None  # User doesn't exist

            client = TestClient(app)
            response = client.post(
                "/auth/password-reset/request",
                json={"email": "nonexistent@example.com"}
            )

            # Should still return success for security (don't reveal if email exists)
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            mock_create.assert_awaited_once()

    async def test_request_password_reset_sends_email(self):
        """Test password reset request sends email when configured."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.create_password_reset_token", new_callable=AsyncMock) as mock_create, \
             patch("app.apis.v1.endpoints_auth.is_email_configured", return_value=True), \
             patch("app.apis.v1.endpoints_auth.send_password_reset_email", new_callable=AsyncMock) as mock_send, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_create.return_value = "test-reset-token"
            mock_send.return_value = True

            client = TestClient(app)
            response = client.post(
                "/auth/password-reset/request",
                json={"email": "test@example.com"}
            )

            assert response.status_code == 200
            mock_send.assert_awaited_once_with("test@example.com", "test-reset-token")

    # ---------------- PASSWORD RESET CONFIRM ----------------
    async def test_confirm_password_reset_success(self):
        """Test successful password reset confirmation."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.reset_password", new_callable=AsyncMock) as mock_reset, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_reset.return_value = True

            client = TestClient(app)
            response = client.post(
                "/auth/password-reset/confirm",
                json={
                    "token": "valid-reset-token",
                    "new_password": "newpassword123"
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "reset" in data["message"].lower() or "success" in data["message"].lower()
            mock_reset.assert_awaited_once()

    async def test_confirm_password_reset_invalid_token(self):
        """Test password reset confirmation fails with invalid token."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.reset_password", new_callable=AsyncMock) as mock_reset, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_reset.return_value = False

            client = TestClient(app)
            response = client.post(
                "/auth/password-reset/confirm",
                json={
                    "token": "invalid-token",
                    "new_password": "newpassword123"
                }
            )

            assert response.status_code == 400
            assert "invalid" in response.json()["detail"].lower() or "expired" in response.json()["detail"].lower()

    # ---------------- PASSWORD RESET VERIFY TOKEN ----------------
    async def test_verify_reset_token_success(self):
        """Test successful token verification."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.verify_password_reset_token", new_callable=AsyncMock) as mock_verify, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_verify.return_value = "test@example.com"

            client = TestClient(app)
            response = client.get("/auth/password-reset/verify/valid-token")

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            mock_verify.assert_awaited_once()
            # Verify the token argument was passed correctly
            call_args = mock_verify.call_args
            assert call_args[0][1] == "valid-token"  # Second positional arg is token

    async def test_verify_reset_token_invalid(self):
        """Test token verification fails for invalid token."""
        from app.main import app

        with patch("app.apis.v1.endpoints_auth.user_service.verify_password_reset_token", new_callable=AsyncMock) as mock_verify, \
             patch("app.db.mongodb_utils.get_database", return_value=self.mock_db):
            mock_verify.return_value = None

            client = TestClient(app)
            response = client.get("/auth/password-reset/verify/invalid-token")

            assert response.status_code == 400
            assert "invalid" in response.json()["detail"].lower() or "expired" in response.json()["detail"].lower()
