import pytest
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.services import security
from app.schemas.user_schema import TokenData
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS


@pytest.mark.asyncio
class TestSecurityService:

    def test_verify_password_correct_and_incorrect(self):
        password = "mysecret"
        hashed = security.get_password_hash(password)

        assert security.verify_password(password, hashed)
        assert not security.verify_password("wrongpassword", hashed)

    def test_get_password_hash_returns_valid_hash(self):
        password = "mypassword"
        hashed = security.get_password_hash(password)
        assert isinstance(hashed, str)
        assert security.verify_password(password, hashed)

    def test_create_access_token_and_refresh_token(self):
        data = {"sub": "user1"}
        access_token = security.create_access_token(data)
        refresh_token = security.create_refresh_token(data)

        access_payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        refresh_payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})

        assert access_payload["sub"] == "user1"
        assert refresh_payload["sub"] == "user1"

        now_ts = int(datetime.now(timezone.utc).timestamp())
        access_exp = access_payload["exp"]
        refresh_exp = refresh_payload["exp"]

        assert now_ts < access_exp
        assert now_ts < refresh_exp

        assert access_exp - now_ts <= ACCESS_TOKEN_EXPIRE_MINUTES * 60 + 5
        assert refresh_exp - now_ts <= REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600 + 5

    def test_decode_token_valid_and_invalid(self):
        data = {"sub": "user123"}
        token = security.create_access_token(data)
        decoded = security.decode_token(token)
        assert isinstance(decoded, TokenData)
        assert decoded.username == "user123"

        assert security.decode_token(token + "invalid") is None

    def test_decode_token_missing_sub_returns_none(self):
        token_without_sub = security.create_token({}, expires_delta=timedelta(minutes=5))
        decoded = security.decode_token(token_without_sub)
        assert decoded is None
