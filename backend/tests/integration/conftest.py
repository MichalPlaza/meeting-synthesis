"""
Integration test fixtures for Knowledge Base features.

These fixtures provide comprehensive mocking for external services:
- Elasticsearch (hybrid search, indexing)
- Ollama (RAG generation, title generation)
- Embedding service (sentence-transformers)

This allows integration tests to run without requiring full infrastructure.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId


@pytest.fixture
def mock_elasticsearch():
    """Mock Elasticsearch client for hybrid search.
    
    Returns realistic search results with proper structure:
    - Hits with scores
    - Meeting metadata (id, title, content_type)
    - Content excerpts
    """
    with patch("app.services.elasticsearch_search_service.es_client") as mock:
        # Default search response with 2 meeting results
        mock.search.return_value = {
            "hits": {
                "hits": [
                    {
                        "_id": "es_doc_1",
                        "_score": 12.5,
                        "_source": {
                            "meeting_id": str(ObjectId()),
                            "meeting_title": "Team Standup - Oct 30",
                            "content": "Discussed project milestones and upcoming deadlines.",
                            "content_type": "transcription",
                            "timestamp": "2025-10-30T10:00:00Z",
                            "project_id": str(ObjectId()),
                            "tags": ["standup", "engineering"],
                        },
                    },
                    {
                        "_id": "es_doc_2",
                        "_score": 10.3,
                        "_source": {
                            "meeting_id": str(ObjectId()),
                            "meeting_title": "Sprint Planning Q4",
                            "content": "Planned work for Q4, assigned tasks to team members.",
                            "content_type": "summary",
                            "project_id": str(ObjectId()),
                            "tags": ["planning", "Q4"],
                        },
                    },
                ]
            }
        }
        
        # Mock count operation
        mock.count.return_value = {"count": 25}
        
        # Mock index operation
        mock.index.return_value = {"result": "created", "_id": "es_doc_new"}
        
        # Mock delete operation
        mock.delete.return_value = {"result": "deleted"}
        
        yield mock


@pytest.fixture
def mock_elasticsearch_empty():
    """Mock Elasticsearch returning no results (for edge cases)."""
    with patch("app.services.elasticsearch_search_service.es_client") as mock:
        mock.search.return_value = {
            "hits": {
                "hits": []
            }
        }
        mock.count.return_value = {"count": 0}
        yield mock


@pytest.fixture
def mock_ollama_rag():
    """Mock Ollama client for RAG generation.
    
    Returns realistic RAG response based on search results.
    """
    with patch("app.services.knowledge_base_rag_service.ollama") as mock_ollama_module:
        # Create mock client instance
        mock_client = AsyncMock()
        
        # Mock chat method for RAG generation
        mock_chat_response = MagicMock()
        mock_chat_response.message.content = (
            "Based on your meetings, the team discussed project milestones "
            "during the Oct 30 standup and planned Q4 work items during "
            "sprint planning. Key action items include finalizing the "
            "roadmap and assigning tasks to team members."
        )
        
        mock_client.chat = AsyncMock(return_value=mock_chat_response)
        
        # Mock AsyncClient constructor
        mock_ollama_module.AsyncClient.return_value = mock_client
        
        yield mock_client


@pytest.fixture
def mock_ollama_title_generation():
    """Mock Ollama client specifically for conversation title generation."""
    with patch("app.services.knowledge_base_rag_service.ollama") as mock_ollama_module:
        # Create mock client instance
        mock_client = AsyncMock()
        
        # Mock chat method for title generation
        mock_chat_response = MagicMock()
        mock_chat_response.message.content = "Project Milestones Discussion"
        
        mock_client.chat = AsyncMock(return_value=mock_chat_response)
        
        # Mock AsyncClient constructor
        mock_ollama_module.AsyncClient.return_value = mock_client
        
        yield mock_client


@pytest.fixture
def mock_ollama_streaming():
    """Mock Ollama client for streaming responses.
    
    Simulates chunk-by-chunk response streaming.
    """
    with patch("app.services.knowledge_base_rag_service.ollama") as mock_ollama_module:
        # Create mock client instance
        mock_client = AsyncMock()
        
        # Mock streaming chat response (async generator)
        async def mock_stream_chunks():
            """Simulate streaming RAG response in chunks."""
            chunks = [
                "Based on ",
                "your meetings, ",
                "the team ",
                "discussed project ",
                "milestones and ",
                "planned Q4 work."
            ]
            for chunk_text in chunks:
                chunk = MagicMock()
                chunk.message.content = chunk_text
                yield chunk
        
        mock_client.chat = AsyncMock(return_value=mock_stream_chunks())
        
        # Mock AsyncClient constructor
        mock_ollama_module.AsyncClient.return_value = mock_client
        
        yield mock_client


@pytest.fixture
def mock_embeddings():
    """Mock embedding service to avoid loading sentence-transformer models.
    
    Returns fake 384-dimensional vector (matching all-MiniLM-L6-v2 dimensions).
    """
    with patch("app.services.embedding_service.generate_embedding") as mock:
        # Return realistic fake embedding vector
        fake_embedding = [0.02 * i for i in range(384)]  # 384 dimensions
        mock.return_value = fake_embedding
        yield mock


@pytest.fixture
def mock_all_knowledge_base_services(
    mock_elasticsearch,
    mock_ollama_rag,
    mock_embeddings
):
    """Convenience fixture combining all KB service mocks.
    
    Use this when testing complete flows that touch multiple services.
    """
    return {
        "elasticsearch": mock_elasticsearch,
        "ollama": mock_ollama_rag,
        "embeddings": mock_embeddings,
    }


@pytest.fixture
def sample_conversation_data():
    """Sample conversation data for testing."""
    user_id = ObjectId()
    project_id = ObjectId()
    
    return {
        "user_id": str(user_id),
        "project_id": str(project_id),
        "title": "Test Conversation",
        "filter_context": {
            "project_ids": [str(project_id)],
            "tags": ["test"],
            "date_from": None,
            "date_to": None,
        }
    }


@pytest.fixture
def sample_chat_message_data(sample_conversation_data):
    """Sample chat message data for testing."""
    conversation_id = ObjectId()
    
    return {
        "conversation_id": str(conversation_id),
        "user_id": sample_conversation_data["user_id"],
        "role": "user",
        "content": "What were the key decisions from last week's meetings?",
        "sources": [],
    }
