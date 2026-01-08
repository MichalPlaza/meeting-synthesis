"""Unit tests for search endpoints with access control."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.apis.v1.endpoints_search import search_meetings


def create_mock_user(role: str = "developer", user_id: str = None) -> MagicMock:
    """Create a mock user."""
    user = MagicMock()
    user.id = ObjectId(user_id) if user_id else ObjectId()
    user.role = role
    user.username = f"test_{role}"
    return user


def create_mock_project(project_id: str = None) -> MagicMock:
    """Create a mock project."""
    project = MagicMock()
    project.id = ObjectId(project_id) if project_id else ObjectId()
    project.name = "Test Project"
    return project


def create_mock_search_result(meeting_id: str = None, project_id: str = None) -> MagicMock:
    """Create a mock search result."""
    result = MagicMock()
    result.meeting_id = meeting_id or str(ObjectId())
    result.meeting_title = "Test Meeting"
    result.project_id = project_id or str(ObjectId())
    result.tags = ["test"]
    result.meeting_datetime = "2025-01-01T00:00:00Z"
    result.content_type = "transcription"
    result.score = 0.95
    result.highlights = ["highlighted text"]
    return result


def create_mock_facets() -> MagicMock:
    """Create mock search facets."""
    facets = MagicMock()
    facets.to_dict.return_value = {
        "projects": [{"id": "proj_1", "count": 5}],
        "tags": [{"name": "test", "count": 3}],
    }
    return facets


@pytest.mark.asyncio
class TestSearchMeetings:
    """Tests for search_meetings endpoint."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_admin_searches_all_projects(
        self, mock_crud, mock_search
    ):
        """Admin users should search across all projects."""
        admin = create_mock_user(role="admin")

        # Admin gets all projects
        proj1 = create_mock_project()
        proj2 = create_mock_project()
        mock_crud.get_projects_filtered = AsyncMock(return_value=[proj1, proj2])

        # Mock search results
        mock_search.return_value = (
            [create_mock_search_result()],
            1,
            create_mock_facets(),
        )

        result = await search_meetings(
            q="test query",
            project_ids=None,
            tags=None,
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=admin,
        )

        assert result.total == 1
        mock_crud.get_projects_filtered.assert_awaited_once()
        # Verify search was called with all project IDs
        call_args = mock_search.call_args
        assert str(proj1.id) in call_args[1]["project_ids"]
        assert str(proj2.id) in call_args[1]["project_ids"]

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_regular_user_filters_by_membership(
        self, mock_crud, mock_search
    ):
        """Regular users should only search their member projects."""
        user = create_mock_user(role="developer")

        # User is member of only one project
        user_project = create_mock_project()
        mock_crud.get_projects_by_member = AsyncMock(return_value=[user_project])

        mock_search.return_value = (
            [create_mock_search_result()],
            1,
            create_mock_facets(),
        )

        result = await search_meetings(
            q="test query",
            project_ids=None,
            tags=None,
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        assert result.total == 1
        mock_crud.get_projects_by_member.assert_awaited_once_with(
            self.mock_db, str(user.id)
        )
        # Verify search was called with only user's project
        call_args = mock_search.call_args
        assert call_args[1]["project_ids"] == [str(user_project.id)]

    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_user_with_no_projects_empty(self, mock_crud):
        """Users with no projects should get empty results."""
        user = create_mock_user(role="developer")

        mock_crud.get_projects_by_member = AsyncMock(return_value=[])

        result = await search_meetings(
            q="test query",
            project_ids=None,
            tags=None,
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        assert result.total == 0
        assert result.results == []

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_with_project_filter_intersects_accessible(
        self, mock_crud, mock_search
    ):
        """Project filter should intersect with accessible projects."""
        user = create_mock_user(role="developer")

        # User has access to proj_1 and proj_2
        proj1 = create_mock_project(project_id="507f1f77bcf86cd799439011")
        proj2 = create_mock_project(project_id="507f1f77bcf86cd799439012")
        mock_crud.get_projects_by_member = AsyncMock(return_value=[proj1, proj2])

        mock_search.return_value = ([], 0, create_mock_facets())

        # User filters by proj_1 only
        await search_meetings(
            q="test",
            project_ids=[str(proj1.id)],
            tags=None,
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        # Search should only include proj_1 (intersection)
        call_args = mock_search.call_args
        assert call_args[1]["project_ids"] == [str(proj1.id)]

    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_with_inaccessible_project_filter_empty(self, mock_crud):
        """Filtering by inaccessible projects should return empty."""
        user = create_mock_user(role="developer")

        # User has access to proj_1 only
        proj1 = create_mock_project(project_id="507f1f77bcf86cd799439011")
        mock_crud.get_projects_by_member = AsyncMock(return_value=[proj1])

        # User tries to filter by proj_999 (not accessible)
        result = await search_meetings(
            q="test",
            project_ids=["507f1f77bcf86cd799439999"],  # Not accessible
            tags=None,
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        assert result.total == 0
        assert result.results == []

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_pagination(self, mock_crud, mock_search):
        """Pagination should work correctly."""
        user = create_mock_user(role="developer")

        proj = create_mock_project()
        mock_crud.get_projects_by_member = AsyncMock(return_value=[proj])

        mock_search.return_value = (
            [create_mock_search_result() for _ in range(10)],
            25,  # Total of 25 results
            create_mock_facets(),
        )

        result = await search_meetings(
            q="test",
            project_ids=None,
            tags=None,
            date_from=None,
            date_to=None,
            page=2,
            page_size=10,
            database=self.mock_db,
            current_user=user,
        )

        assert result.total == 25
        assert result.page == 2
        assert result.page_size == 10
        assert result.total_pages == 3  # 25 / 10 = 3 pages

        # Verify pagination passed to search
        call_args = mock_search.call_args
        assert call_args[1]["page"] == 2
        assert call_args[1]["page_size"] == 10

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_with_tags_filter(self, mock_crud, mock_search):
        """Tags filter should be passed to search."""
        user = create_mock_user(role="developer")

        proj = create_mock_project()
        mock_crud.get_projects_by_member = AsyncMock(return_value=[proj])

        mock_search.return_value = ([], 0, create_mock_facets())

        await search_meetings(
            q="test",
            project_ids=None,
            tags=["sprint", "planning"],
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        call_args = mock_search.call_args
        assert call_args[1]["tags"] == ["sprint", "planning"]

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_with_date_filter(self, mock_crud, mock_search):
        """Date filters should be passed to search."""
        user = create_mock_user(role="developer")

        proj = create_mock_project()
        mock_crud.get_projects_by_member = AsyncMock(return_value=[proj])

        mock_search.return_value = ([], 0, create_mock_facets())

        await search_meetings(
            q="test",
            project_ids=None,
            tags=None,
            date_from="2025-01-01",
            date_to="2025-01-31",
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        call_args = mock_search.call_args
        assert call_args[1]["date_from"] == "2025-01-01"
        assert call_args[1]["date_to"] == "2025-01-31"

    @patch("app.apis.v1.endpoints_search.dashboard_search")
    @patch("app.apis.v1.endpoints_search.crud_projects")
    async def test_search_empty_query_browse_mode(self, mock_crud, mock_search):
        """Empty query should work (browse mode)."""
        user = create_mock_user(role="developer")

        proj = create_mock_project()
        mock_crud.get_projects_by_member = AsyncMock(return_value=[proj])

        mock_search.return_value = (
            [create_mock_search_result()],
            1,
            create_mock_facets(),
        )

        result = await search_meetings(
            q="",  # Empty query
            project_ids=None,
            tags=None,
            date_from=None,
            date_to=None,
            page=1,
            page_size=20,
            database=self.mock_db,
            current_user=user,
        )

        assert result.total == 1
        call_args = mock_search.call_args
        assert call_args[1]["query"] == ""
