# tests/unit/schemas/test_user_schema.py
from datetime import datetime, UTC

import pytest
from bson import ObjectId
from pydantic import ValidationError

from app.models.py_object_id import PyObjectId
from app.schemas import user_schema


class TestUserModels:

    @pytest.fixture
    def valid_id(self):
        return str(ObjectId())

    @pytest.fixture
    def valid_email(self):
        return "test@example.com"

    def test_user_create_happy(self, valid_email):
        user = user_schema.UserCreate(
            username="testuser",
            email=valid_email,
            password="securepass",
            full_name="Test User"
        )
        assert user.username == "testuser"
        assert user.email == valid_email
        assert user.full_name == "Test User"

    def test_user_create_optional_full_name(self, valid_email):
        user = user_schema.UserCreate(
            username="testuser2",
            email=valid_email,
            password="securepass"
        )
        assert user.full_name is None

    def test_user_update_partial(self, valid_email):
        user_update = user_schema.UserUpdate(
            email=valid_email
        )
        assert user_update.email == valid_email
        assert user_update.username is None
        assert user_update.full_name is None

    def test_user_response_happy(self, valid_id, valid_email):
        from app.models.user import UserRole
        user_resp = user_schema.UserResponse(
            _id=PyObjectId(valid_id),
            username="respuser",
            email=valid_email,
            full_name="Response User",
            role=UserRole.DEVELOPER,
            is_approved=False,
            can_edit=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC)
        )
        assert user_resp.username == "respuser"
        assert isinstance(user_resp.id, PyObjectId)
        assert user_resp.full_name == "Response User"

    def test_user_response_missing_required(self, valid_id):
        with pytest.raises(ValidationError):
            user_schema.UserResponse(
                username="missingemail",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                _id=PyObjectId(valid_id)
            )

    def test_user_create_invalid_email(self):
        with pytest.raises(ValidationError):
            user_schema.UserCreate(
                username="baduser",
                email="not-an-email",
                password="pass"
            )

    def test_user_login_happy(self):
        login = user_schema.UserLogin(
            username_or_email="testuser",
            password="pass",
            remember_me=True
        )
        assert login.remember_me is True

    def test_token_and_data_models(self):
        token = user_schema.Token(
            access_token="abc123",
            refresh_token="refresh123",
            token_type="bearer"
        )
        assert token.access_token == "abc123"
        token_data = user_schema.TokenData(username="user1")
        assert token_data.username == "user1"
        refresh_request = user_schema.RefreshTokenRequest(refresh_token="refresh123")
        assert refresh_request.refresh_token == "refresh123"
