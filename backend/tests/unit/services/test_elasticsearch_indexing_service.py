"""Unit tests for Elasticsearch indexing service."""

import pytest
from datetime import datetime, UTC
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.elasticsearch_indexing_service import (
    index_meeting_document,
    index_meeting_documents_batch,
    delete_meeting_documents,
    get_index_stats,
)


@pytest.mark.asyncio
class TestElasticsearchIndexingService:
    """Tests for Elasticsearch indexing operations."""

    @patch("app.services.elasticsearch_indexing_service.get_elasticsearch_client")
    @patch("app.services.elasticsearch_indexing_service.generate_embedding")
    async def test_index_meeting_document_success(
        self, mock_generate_embedding, mock_get_client
    ):
        """Test successful document indexing."""
        # Mock embedding generation
        mock_generate_embedding.return_value = [0.1] * 384

        # Mock Elasticsearch client
        mock_client = AsyncMock()
        mock_client.index.return_value = {"_id": "test_doc_123"}
        mock_get_client.return_value = mock_client

        # Index document
        doc_id = await index_meeting_document(
            meeting_id="meeting_123",
            project_id="project_456",
            user_id="user_789",
            title="Test Meeting",
            content="Test content for indexing",
            content_type="transcription",
            tags=["test", "demo"],
        )

        # Assertions
        assert doc_id == "test_doc_123"
        mock_generate_embedding.assert_awaited_once()
        mock_client.index.assert_awaited_once()
        mock_client.close.assert_awaited_once()

    @patch("app.services.elasticsearch_indexing_service.get_elasticsearch_client")
    @patch("app.services.elasticsearch_indexing_service.generate_embedding")
    async def test_index_meeting_documents_batch(
        self, mock_generate_embedding, mock_get_client
    ):
        """Test batch document indexing."""
        # Mock embedding generation
        mock_generate_embedding.return_value = [0.1] * 384

        # Mock Elasticsearch client
        mock_client = AsyncMock()
        mock_client.bulk.return_value = {
            "items": [
                {"index": {"_id": "doc1"}},
                {"index": {"_id": "doc2"}},
                {"index": {"_id": "doc3"}},
            ]
        }
        mock_get_client.return_value = mock_client

        # Prepare test documents
        documents = [
            {
                "meeting_id": "meeting_1",
                "project_id": "project_1",
                "user_id": "user_1",
                "title": "Meeting 1",
                "content": "Content 1",
                "content_type": "transcription",
            },
            {
                "meeting_id": "meeting_2",
                "project_id": "project_1",
                "user_id": "user_1",
                "title": "Meeting 2",
                "content": "Content 2",
                "content_type": "summary",
            },
            {
                "meeting_id": "meeting_3",
                "project_id": "project_2",
                "user_id": "user_1",
                "title": "Meeting 3",
                "content": "Content 3",
                "content_type": "key_topic",
            },
        ]

        # Index batch
        doc_ids = await index_meeting_documents_batch(documents)

        # Assertions
        assert len(doc_ids) == 3
        assert doc_ids == ["doc1", "doc2", "doc3"]
        assert mock_generate_embedding.await_count == 3
        mock_client.bulk.assert_awaited_once()

    @patch("app.services.elasticsearch_indexing_service.get_elasticsearch_client")
    async def test_delete_meeting_documents(self, mock_get_client):
        """Test deleting documents by meeting ID."""
        # Mock Elasticsearch client
        mock_client = AsyncMock()
        mock_client.delete_by_query.return_value = {"deleted": 5}
        mock_get_client.return_value = mock_client

        # Delete documents
        deleted_count = await delete_meeting_documents("meeting_123")

        # Assertions
        assert deleted_count == 5
        mock_client.delete_by_query.assert_awaited_once()
        
        # Verify query structure
        call_args = mock_client.delete_by_query.call_args
        assert call_args[1]["body"]["query"]["term"]["meeting_id"] == "meeting_123"

    @patch("app.services.elasticsearch_indexing_service.get_elasticsearch_client")
    async def test_get_index_stats(self, mock_get_client):
        """Test retrieving index statistics."""
        # Mock Elasticsearch client
        mock_client = AsyncMock()
        mock_client.indices.stats.return_value = {
            "indices": {
                "meetings_knowledge_base": {
                    "total": {
                        "docs": {"count": 100, "deleted": 5},
                        "store": {"size_in_bytes": 1048576},  # 1 MB
                    }
                }
            }
        }
        mock_get_client.return_value = mock_client

        # Get stats
        stats = await get_index_stats()

        # Assertions
        assert stats["document_count"] == 100
        assert stats["deleted_count"] == 5
        assert stats["size_bytes"] == 1048576
        assert stats["size_mb"] == 1.0

    @patch("app.services.elasticsearch_indexing_service.get_elasticsearch_client")
    @patch("app.services.elasticsearch_indexing_service.generate_embedding")
    async def test_index_document_with_metadata(
        self, mock_generate_embedding, mock_get_client
    ):
        """Test indexing document with metadata."""
        mock_generate_embedding.return_value = [0.1] * 384
        
        mock_client = AsyncMock()
        mock_client.index.return_value = {"_id": "doc_with_meta"}
        mock_get_client.return_value = mock_client

        metadata = {"speaker": "John Doe", "timestamp": "00:05:30", "confidence": 0.95}

        doc_id = await index_meeting_document(
            meeting_id="meeting_123",
            project_id="project_456",
            user_id="user_789",
            title="Test Meeting",
            content="Test content",
            content_type="transcription",
            metadata=metadata,
        )

        assert doc_id == "doc_with_meta"
        
        # Verify metadata was included
        call_args = mock_client.index.call_args
        indexed_doc = call_args[1]["document"]
        assert indexed_doc["metadata"] == metadata
