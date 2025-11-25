"""Unit tests for Elasticsearch hybrid search service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, UTC

from app.services.elasticsearch_search_service import (
    hybrid_search,
    SearchResult,
)
from app.models.knowledge_base import FilterContext


@pytest.mark.asyncio
class TestSearchResult:
    """Tests for SearchResult class."""

    async def test_search_result_properties(self):
        """Test SearchResult property access."""
        hit = {
            "_score": 0.95,
            "_source": {
                "meeting_id": "meeting_123",
                "title": "Sprint Planning",
                "content": "Discussed sprint goals and timeline",
                "content_type": "transcription",
                "user_id": "user_123",
                "metadata": {
                    "project_id": "proj_1",
                    "tags": ["sprint", "planning"]
                }
            }
        }

        result = SearchResult(hit)

        assert result.meeting_id == "meeting_123"
        assert result.meeting_title == "Sprint Planning"
        assert result.content == "Discussed sprint goals and timeline"
        assert result.content_type == "transcription"
        assert result.score == 0.95
        assert result.metadata["project_id"] == "proj_1"

    async def test_search_result_no_metadata(self):
        """Test SearchResult with no metadata."""
        hit = {
            "_score": 0.80,
            "_source": {
                "meeting_id": "meeting_456",
                "title": "Daily Standup",
                "content": "Quick status update",
                "content_type": "summary",
            }
        }

        result = SearchResult(hit)

        assert result.meeting_id == "meeting_456"
        assert result.metadata == {}


@pytest.mark.asyncio
class TestHybridSearch:
    """Tests for hybrid search functionality."""

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_success(self, mock_embed, mock_client):
        """Test successful hybrid search without filters."""
        # Mock embedding
        mock_embed.return_value = [0.1] * 384

        # Mock Elasticsearch response
        mock_es = AsyncMock()
        mock_es.search.return_value = {
            "hits": {
                "hits": [
                    {
                        "_score": 0.95,
                        "_source": {
                            "meeting_id": "meeting_1",
                            "title": "Test Meeting",
                            "content": "Test content about the project",
                            "content_type": "transcription",
                            "user_id": "user_123"
                        }
                    },
                    {
                        "_score": 0.85,
                        "_source": {
                            "meeting_id": "meeting_2",
                            "title": "Another Meeting",
                            "content": "More content",
                            "content_type": "summary",
                            "user_id": "user_123"
                        }
                    }
                ]
            }
        }
        mock_client.return_value = mock_es

        # Execute search
        results = await hybrid_search(
            query="test query",
            user_id="user_123",
            top_k=10
        )

        # Verify results
        assert len(results) == 2
        assert results[0].meeting_id == "meeting_1"
        assert results[0].score == 0.95
        assert results[1].meeting_id == "meeting_2"
        assert results[1].score == 0.85

        # Verify embedding was generated
        mock_embed.assert_awaited_once_with("test query")

        # Verify Elasticsearch was called
        mock_es.search.assert_awaited_once()
        mock_es.close.assert_awaited_once()

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_with_project_filter(self, mock_embed, mock_client):
        """Test hybrid search with project filter."""
        mock_embed.return_value = [0.1] * 384

        mock_es = AsyncMock()
        mock_es.search.return_value = {
            "hits": {
                "hits": [
                    {
                        "_score": 0.90,
                        "_source": {
                            "meeting_id": "meeting_1",
                            "title": "Project Meeting",
                            "content": "Project specific content",
                            "content_type": "transcription",
                            "user_id": "user_123",
                            "project_id": "proj_1"
                        }
                    }
                ]
            }
        }
        mock_client.return_value = mock_es

        # Create filter context
        filters = FilterContext(project_ids=["proj_1", "proj_2"])

        # Execute search
        results = await hybrid_search(
            query="project meeting",
            user_id="user_123",
            filters=filters,
            top_k=5
        )

        assert len(results) == 1
        assert results[0].meeting_id == "meeting_1"

        # Verify search query includes project filter
        call_args = mock_es.search.call_args
        query = call_args[1]["body"]["query"]
        must_clauses = query["bool"]["must"]

        # Check that project filter is in must clauses
        project_filter = next(
            (c for c in must_clauses if "terms" in c and "project_id" in c["terms"]),
            None
        )
        assert project_filter is not None
        assert project_filter["terms"]["project_id"] == ["proj_1", "proj_2"]

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_with_date_filter(self, mock_embed, mock_client):
        """Test hybrid search with date range filter."""
        mock_embed.return_value = [0.1] * 384

        mock_es = AsyncMock()
        mock_es.search.return_value = {
            "hits": {
                "hits": []
            }
        }
        mock_client.return_value = mock_es

        # Create filter with date range
        date_from = datetime(2025, 10, 1, tzinfo=UTC)
        date_to = datetime(2025, 10, 31, tzinfo=UTC)
        filters = FilterContext(date_from=date_from, date_to=date_to)

        # Execute search
        results = await hybrid_search(
            query="october meetings",
            user_id="user_123",
            filters=filters
        )

        assert len(results) == 0

        # Verify date filter in query
        call_args = mock_es.search.call_args
        query = call_args[1]["body"]["query"]
        must_clauses = query["bool"]["must"]

        # Check date range filter
        date_filter = next(
            (c for c in must_clauses if "range" in c and "meeting_datetime" in c["range"]),
            None
        )
        assert date_filter is not None
        assert "gte" in date_filter["range"]["meeting_datetime"]
        assert "lte" in date_filter["range"]["meeting_datetime"]

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_with_tags_filter(self, mock_embed, mock_client):
        """Test hybrid search with tags filter."""
        mock_embed.return_value = [0.1] * 384

        mock_es = AsyncMock()
        mock_es.search.return_value = {
            "hits": {
                "hits": [
                    {
                        "_score": 0.88,
                        "_source": {
                            "meeting_id": "meeting_1",
                            "title": "Sprint Planning",
                            "content": "Sprint content",
                            "content_type": "summary",
                            "user_id": "user_123",
                            "tags": ["sprint", "planning"]
                        }
                    }
                ]
            }
        }
        mock_client.return_value = mock_es

        # Create filter with tags
        filters = FilterContext(tags=["sprint", "planning"])

        # Execute search
        results = await hybrid_search(
            query="sprint planning",
            user_id="user_123",
            filters=filters
        )

        assert len(results) == 1

        # Verify tags filter in query
        call_args = mock_es.search.call_args
        query = call_args[1]["body"]["query"]
        must_clauses = query["bool"]["must"]

        tags_filter = next(
            (c for c in must_clauses if "terms" in c and "tags" in c["terms"]),
            None
        )
        assert tags_filter is not None
        assert tags_filter["terms"]["tags"] == ["sprint", "planning"]

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_empty_results(self, mock_embed, mock_client):
        """Test hybrid search with no results."""
        mock_embed.return_value = [0.1] * 384

        mock_es = AsyncMock()
        mock_es.search.return_value = {
            "hits": {
                "hits": []
            }
        }
        mock_client.return_value = mock_es

        results = await hybrid_search(
            query="nonexistent query",
            user_id="user_123"
        )

        assert len(results) == 0
        mock_es.close.assert_awaited_once()

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_error_handling(self, mock_embed, mock_client):
        """Test hybrid search error handling."""
        mock_embed.return_value = [0.1] * 384

        mock_es = AsyncMock()
        mock_es.search.side_effect = Exception("Search failed")
        mock_client.return_value = mock_es

        with pytest.raises(Exception, match="Search failed"):
            await hybrid_search(
                query="test query",
                user_id="user_123"
            )

        # Client should still be closed
        mock_es.close.assert_awaited_once()

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_custom_top_k(self, mock_embed, mock_client):
        """Test hybrid search with custom top_k parameter."""
        mock_embed.return_value = [0.1] * 384

        mock_es = AsyncMock()
        mock_es.search.return_value = {
            "hits": {
                "hits": []
            }
        }
        mock_client.return_value = mock_es

        await hybrid_search(
            query="test query",
            user_id="user_123",
            top_k=5
        )

        # Verify size parameter
        call_args = mock_es.search.call_args
        query = call_args[1]["body"]
        assert query["size"] == 5
