import pytest
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from datetime import UTC, datetime

from app.crud import crud_users
from app.models.user import User
from app.schemas.user_schema import UserCreate


class TestUserCRUD:
    def setup_method(self):
        self.mock_collection = AsyncMock()
        self.mock_db = MagicMock()
        self.mock_db.__getitem__.return_value = self.mock_collection

    @pytest.mark.asyncio
    async def test_get_user_by_email_found(self):
        user_doc = {"_id": ObjectId(), "username": "test", "email": "test@example.com", "hashed_password": "hash"}
        self.mock_collection.find_one.return_value = user_doc

        result = await crud_users.get_user_by_email(self.mock_db, "test@example.com")

        assert isinstance(result, User)
        assert result.email == "test@example.com"
        assert result.id == user_doc["_id"]

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self):
        self.mock_collection.find_one.return_value = None

        result = await crud_users.get_user_by_email(self.mock_db, "missing@example.com")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_user_by_username_found(self):
        user_doc = {"_id": ObjectId(), "username": "john", "email": "john@example.com", "hashed_password": "hash"}
        self.mock_collection.find_one.return_value = user_doc

        result = await crud_users.get_user_by_username(self.mock_db, "john")

        assert isinstance(result, User)
        assert result.username == "john"
        assert result.id == user_doc["_id"]

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_found(self):
        self.mock_collection.find_one.return_value = None

        result = await crud_users.get_user_by_username(self.mock_db, "missing")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_user_by_username_or_email_found(self):
        user_doc = {"_id": ObjectId(), "username": "anna", "email": "anna@example.com", "hashed_password": "hash"}
        self.mock_collection.find_one.return_value = user_doc

        result = await crud_users.get_user_by_username_or_email(self.mock_db, "anna")

        assert isinstance(result, User)
        assert result.username == "anna"
        assert result.id == user_doc["_id"]

    @pytest.mark.asyncio
    async def test_get_user_by_username_or_email_not_found(self):
        self.mock_collection.find_one.return_value = None

        result = await crud_users.get_user_by_username_or_email(self.mock_db, "ghost")
        assert result is None

    @pytest.mark.asyncio
    async def test_create_user_success(self, monkeypatch):
        user_data = UserCreate(username="newuser", email="new@example.com", password="secret", full_name="New User")

        monkeypatch.setattr(crud_users, "get_password_hash", lambda pwd: "hashed123")

        mock_result = AsyncMock()
        mock_result.inserted_id = ObjectId()
        self.mock_collection.insert_one.return_value = mock_result

        result = await crud_users.create_user(self.mock_db, user_data)

        assert isinstance(result, User)
        assert result.username == "newuser"
        assert result.hashed_password == "hashed123"
        assert isinstance(result.id, ObjectId)

    @pytest.mark.asyncio
    async def test_get_all_users(self):
        docs = [
            {"_id": ObjectId(), "username": "u1", "email": "u1@example.com", "hashed_password": "h1"},
            {"_id": ObjectId(), "username": "u2", "email": "u2@example.com", "hashed_password": "h2"},
        ]

        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=docs)

        self.mock_collection.find = MagicMock(return_value=mock_cursor)

        result = await crud_users.get_all_users(self.mock_db)

        assert len(result) == 2
        assert all(isinstance(u, User) for u in result)

    @pytest.mark.asyncio
    async def test_get_user_by_id_valid_found(self):
        oid = ObjectId()
        user_doc = {"_id": oid, "username": "x", "email": "x@example.com", "hashed_password": "h"}
        self.mock_collection.find_one.return_value = user_doc

        result = await crud_users.get_user_by_id(self.mock_db, str(oid))

        assert isinstance(result, User)
        assert result.id == oid

    @pytest.mark.asyncio
    async def test_get_user_by_id_invalid_objectid(self):
        result = await crud_users.get_user_by_id(self.mock_db, "not-an-oid")

        assert result is None
        self.mock_collection.find_one.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_user_by_id_valid_not_found(self):
        oid = ObjectId()
        self.mock_collection.find_one.return_value = None

        result = await crud_users.get_user_by_id(self.mock_db, str(oid))
        assert result is None

    @pytest.mark.asyncio
    async def test_get_user_by_id_exception(self):
        oid = ObjectId()
        self.mock_collection.find_one.side_effect = Exception("db error")

        result = await crud_users.get_user_by_id(self.mock_db, str(oid))
        assert result is None
