"""Unit tests for comments endpoints with access control."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from fastapi import HTTPException

from app.apis.v1.endpoints_comments import (
    add_comment,
    list_comments,
    delete_comment,
    update_comment,
)
from app.schemas.comment_schema import CommentCreate, CommentUpdate


def create_mock_user(role: str = "developer", user_id: str = None) -> MagicMock:
    """Create a mock user."""
    user = MagicMock()
    user.id = ObjectId(user_id) if user_id else ObjectId()
    user.role = role
    user.username = f"test_{role}"
    return user


def create_mock_meeting(project_id: str = None) -> MagicMock:
    """Create a mock meeting."""
    meeting = MagicMock()
    meeting.id = ObjectId()
    meeting.project_id = ObjectId(project_id) if project_id else ObjectId()
    meeting.title = "Test Meeting"
    return meeting


def create_mock_comment(author_id: str = None, meeting_id: str = None) -> MagicMock:
    """Create a mock comment."""
    comment = MagicMock()
    comment.id = str(ObjectId())
    comment.author_id = author_id or str(ObjectId())
    comment.meeting_id = meeting_id or str(ObjectId())
    comment.content = "Test comment content"
    comment.author_name = "test_user"
    comment.created_at = "2025-01-01T00:00:00Z"
    return comment


@pytest.mark.asyncio
class TestAddComment:
    """Tests for add_comment endpoint."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_comments.comment_service")
    @patch("app.apis.v1.endpoints_comments.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_add_comment_member_success(
        self, mock_crud, mock_access, mock_service
    ):
        """Members should be able to add comments."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_crud.get_meeting_by_id = AsyncMock(return_value=meeting)
        mock_access.return_value = True
        mock_service.add_comment = AsyncMock(return_value=create_mock_comment())

        comment_data = CommentCreate(content="Test comment")

        result = await add_comment(
            meeting_id=meeting_id,
            data=comment_data,
            database=self.mock_db,
            current_user=user,
        )

        assert result is not None
        mock_access.assert_awaited_once()
        mock_service.add_comment.assert_awaited_once()

    @patch("app.apis.v1.endpoints_comments.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_add_comment_non_member_forbidden(self, mock_crud, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_crud.get_meeting_by_id = AsyncMock(return_value=meeting)
        mock_access.return_value = False

        comment_data = CommentCreate(content="Test comment")

        with pytest.raises(HTTPException) as exc_info:
            await add_comment(
                meeting_id=meeting_id,
                data=comment_data,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "access" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_add_comment_meeting_not_found(self, mock_crud):
        """Should return 404 if meeting doesn't exist."""
        user = create_mock_user()
        meeting_id = str(ObjectId())

        mock_crud.get_meeting_by_id = AsyncMock(return_value=None)

        comment_data = CommentCreate(content="Test comment")

        with pytest.raises(HTTPException) as exc_info:
            await add_comment(
                meeting_id=meeting_id,
                data=comment_data,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
class TestListComments:
    """Tests for list_comments endpoint."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_comments.comment_service")
    @patch("app.apis.v1.endpoints_comments.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_list_comments_member_success(
        self, mock_crud, mock_access, mock_service
    ):
        """Members should be able to list comments."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_crud.get_meeting_by_id = AsyncMock(return_value=meeting)
        mock_access.return_value = True
        mock_service.get_comments = AsyncMock(
            return_value=[create_mock_comment(), create_mock_comment()]
        )

        result = await list_comments(
            meeting_id=meeting_id,
            database=self.mock_db,
            current_user=user,
        )

        assert len(result) == 2
        mock_access.assert_awaited_once()
        mock_service.get_comments.assert_awaited_once()

    @patch("app.apis.v1.endpoints_comments.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_list_comments_non_member_forbidden(self, mock_crud, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_crud.get_meeting_by_id = AsyncMock(return_value=meeting)
        mock_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await list_comments(
                meeting_id=meeting_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403

    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_list_comments_meeting_not_found(self, mock_crud):
        """Should return 404 if meeting doesn't exist."""
        user = create_mock_user()
        meeting_id = str(ObjectId())

        mock_crud.get_meeting_by_id = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await list_comments(
                meeting_id=meeting_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 404

    @patch("app.apis.v1.endpoints_comments.comment_service")
    @patch("app.apis.v1.endpoints_comments.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_comments.crud_meetings")
    async def test_list_comments_admin_success(
        self, mock_crud, mock_access, mock_service
    ):
        """Admins should be able to list comments (via user_can_access_meeting)."""
        admin = create_mock_user(role="admin")
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_crud.get_meeting_by_id = AsyncMock(return_value=meeting)
        mock_access.return_value = True  # Admin access granted
        mock_service.get_comments = AsyncMock(return_value=[])

        result = await list_comments(
            meeting_id=meeting_id,
            database=self.mock_db,
            current_user=admin,
        )

        assert result == []


@pytest.mark.asyncio
class TestDeleteComment:
    """Tests for delete_comment endpoint."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_comments.comment_service")
    async def test_delete_comment_owner_success(self, mock_service):
        """Comment owner should be able to delete their comment."""
        user = create_mock_user()
        comment_id = str(ObjectId())

        mock_service.delete_comment = AsyncMock(return_value=None)

        # Should not raise
        await delete_comment(
            comment_id=comment_id,
            database=self.mock_db,
            current_user=user,
        )

        mock_service.delete_comment.assert_awaited_once_with(
            self.mock_db, comment_id, str(user.id)
        )


@pytest.mark.asyncio
class TestUpdateComment:
    """Tests for update_comment endpoint."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_comments.comment_service")
    async def test_update_comment_owner_success(self, mock_service):
        """Comment owner should be able to update their comment."""
        user = create_mock_user()
        comment_id = str(ObjectId())

        updated_comment = create_mock_comment()
        updated_comment.content = "Updated content"
        mock_service.update_comment = AsyncMock(return_value=updated_comment)

        update_data = CommentUpdate(content="Updated content")

        result = await update_comment(
            comment_id=comment_id,
            data=update_data,
            database=self.mock_db,
            current_user=user,
        )

        assert result.content == "Updated content"
        mock_service.update_comment.assert_awaited_once_with(
            self.mock_db, comment_id, str(user.id), "Updated content"
        )
