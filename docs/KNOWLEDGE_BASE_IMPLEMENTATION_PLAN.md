# Knowledge Base - Implementation Plan

## 📋 Przegląd

Ten dokument przedstawia szczegółowy, **krok po kroku** plan implementacji funkcji Knowledge Base z podziałem na mikro-zadania zgodne z metodologią TDD (Test-Driven Development).

---

## 🎯 Założenia Wstępne

### Wymagania środowiskowe

- ✅ Docker & Docker Compose
- ✅ Python 3.11+
- ✅ Node.js 18+
- ✅ MongoDB (istniejący)
- ✅ Redis (istniejący)
- ⚠️ **Elasticsearch 8.x** (DO INSTALACJI)
- ⚠️ **Sentence Transformers** (DO INSTALACJI)

### Szacowany czas implementacji

- **Faza 1-2 (Infrastructure)**: 2 tygodnie
- **Faza 3-4 (Backend)**: 2 tygodnie
- **Faza 5-6 (Frontend)**: 2 tygodnie
- **Faza 7 (Testing)**: 1 tydzień
- **TOTAL**: ~7 tygodni

---

## 📦 Faza 1: Infrastructure Setup (Tydzień 1)

### 1.1 Elasticsearch Setup

#### Task 1.1.1: Dodaj Elasticsearch do docker-compose

```yaml
# docker-compose.dev.yml

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: meeting_synthesis_elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - app-network

volumes:
  elasticsearch_data:
```

**Test:**

```bash
# Uruchom i sprawdź
docker-compose -f docker-compose.dev.yml up elasticsearch -d
curl http://localhost:9200/_cluster/health
```

#### Task 1.1.2: Dodaj zmienne środowiskowe

```bash
# .env

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=meetings_knowledge_base
```

#### Task 1.1.3: Zainstaluj biblioteki Python

```bash
# backend/pyproject.toml

[tool.poetry.dependencies]
elasticsearch = "^8.11.0"
sentence-transformers = "^2.2.2"
```

**Test:**

```bash
cd backend
poetry add elasticsearch sentence-transformers
poetry install
```

### 1.2 Elasticsearch Client Service

#### Task 1.2.1: Utwórz plik konfiguracji

```python
# backend/app/core/elasticsearch_config.py

import os
from elasticsearch import AsyncElasticsearch

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
ELASTICSEARCH_INDEX = os.getenv("ELASTICSEARCH_INDEX_NAME", "meetings_knowledge_base")

def get_elasticsearch_client() -> AsyncElasticsearch:
    """Get Elasticsearch client instance."""
    return AsyncElasticsearch(
        [ELASTICSEARCH_URL],
        verify_certs=False,
        request_timeout=30
    )

async def close_elasticsearch_client(client: AsyncElasticsearch):
    """Close Elasticsearch client."""
    await client.close()
```

**Test (TDD):**

```python
# backend/tests/unit/core/test_elasticsearch_config.py

import pytest
from app.core.elasticsearch_config import get_elasticsearch_client, close_elasticsearch_client

@pytest.mark.asyncio
class TestElasticsearchConfig:

    async def test_get_client_creates_instance(self):
        """Test that client is created successfully."""
        client = get_elasticsearch_client()
        assert client is not None
        await close_elasticsearch_client(client)

    async def test_client_ping(self):
        """Test client can ping Elasticsearch."""
        client = get_elasticsearch_client()
        result = await client.ping()
        assert result is True
        await close_elasticsearch_client(client)
```

#### Task 1.2.2: Utwórz mapping dla indexu

```python
# backend/app/services/elasticsearch_mapping.py

KNOWLEDGE_BASE_MAPPING = {
    "mappings": {
        "properties": {
            "meeting_id": {"type": "keyword"},
            "project_id": {"type": "keyword"},
            "user_id": {"type": "keyword"},
            "title": {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}}
            },
            "content": {
                "type": "text",
                "analyzer": "standard"
            },
            "content_type": {
                "type": "keyword"
            },
            "tags": {"type": "keyword"},
            "meeting_datetime": {"type": "date"},
            "created_at": {"type": "date"},
            "embedding": {
                "type": "dense_vector",
                "dims": 384,
                "index": True,
                "similarity": "cosine"
            },
            "metadata": {
                "type": "object",
                "properties": {
                    "speaker": {"type": "keyword"},
                    "timestamp": {"type": "keyword"},
                    "confidence": {"type": "float"}
                }
            }
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "custom_analyzer": {
                    "type": "standard",
                    "stopwords": "_english_"
                }
            }
        }
    }
}
```

#### Task 1.2.3: Utwórz script do inicjalizacji indexu

```python
# backend/scripts/init_elasticsearch.py

import asyncio
from app.core.elasticsearch_config import get_elasticsearch_client, close_elasticsearch_client, ELASTICSEARCH_INDEX
from app.services.elasticsearch_mapping import KNOWLEDGE_BASE_MAPPING

async def init_index():
    """Initialize Elasticsearch index with mapping."""
    client = get_elasticsearch_client()

    try:
        # Check if index exists
        exists = await client.indices.exists(index=ELASTICSEARCH_INDEX)

        if exists:
            print(f"Index {ELASTICSEARCH_INDEX} already exists. Deleting...")
            await client.indices.delete(index=ELASTICSEARCH_INDEX)

        # Create index with mapping
        print(f"Creating index {ELASTICSEARCH_INDEX}...")
        await client.indices.create(
            index=ELASTICSEARCH_INDEX,
            body=KNOWLEDGE_BASE_MAPPING
        )
        print(f"Index {ELASTICSEARCH_INDEX} created successfully!")

    except Exception as e:
        print(f"Error initializing index: {e}")
    finally:
        await close_elasticsearch_client(client)

if __name__ == "__main__":
    asyncio.run(init_index())
```

**Test:**

```bash
poetry run python backend/scripts/init_elasticsearch.py
curl http://localhost:9200/meetings_knowledge_base/_mapping
```

---

## 📦 Faza 2: Embedding Service (Tydzień 2)

### 2.1 Sentence Transformers Service

#### Task 2.1.1: Utwórz embedding service

```python
# backend/app/services/embedding_service.py

import logging
from sentence_transformers import SentenceTransformer
from functools import lru_cache

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_embedding_model():
    """Load and cache embedding model."""
    logger.info("Loading embedding model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions
    logger.info("Embedding model loaded successfully")
    return model

async def generate_embedding(text: str) -> list[float]:
    """
    Generate embedding vector for text.

    Args:
        text: Input text to embed

    Returns:
        List of 384 floats representing embedding
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    model = get_embedding_model()
    embedding = model.encode(text, convert_to_tensor=False)
    return embedding.tolist()

async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for multiple texts in batch.

    Args:
        texts: List of texts to embed

    Returns:
        List of embedding vectors
    """
    if not texts:
        return []

    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_tensor=False, batch_size=32)
    return [emb.tolist() for emb in embeddings]
```

**Test (TDD):**

```python
# backend/tests/unit/services/test_embedding_service.py

import pytest
from app.services.embedding_service import generate_embedding, generate_embeddings_batch

@pytest.mark.asyncio
class TestEmbeddingService:

    async def test_generate_embedding_success(self):
        """Test embedding generation for valid text."""
        text = "This is a test meeting transcript"
        embedding = await generate_embedding(text)

        assert isinstance(embedding, list)
        assert len(embedding) == 384
        assert all(isinstance(x, float) for x in embedding)

    async def test_generate_embedding_empty_text(self):
        """Test embedding generation fails for empty text."""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            await generate_embedding("")

    async def test_generate_embeddings_batch(self):
        """Test batch embedding generation."""
        texts = [
            "First meeting",
            "Second meeting",
            "Third meeting"
        ]
        embeddings = await generate_embeddings_batch(texts)

        assert len(embeddings) == 3
        assert all(len(emb) == 384 for emb in embeddings)

    async def test_embedding_similarity(self):
        """Test similar texts have similar embeddings."""
        text1 = "The marketing team discussed budget"
        text2 = "Marketing team talked about the budget"
        text3 = "Software development sprint planning"

        emb1 = await generate_embedding(text1)
        emb2 = await generate_embedding(text2)
        emb3 = await generate_embedding(text3)

        # Cosine similarity (simplified)
        from numpy import dot
        from numpy.linalg import norm

        sim_1_2 = dot(emb1, emb2) / (norm(emb1) * norm(emb2))
        sim_1_3 = dot(emb1, emb3) / (norm(emb1) * norm(emb3))

        # Similar texts should have higher similarity
        assert sim_1_2 > sim_1_3
```

### 2.2 Indexing Service

#### Task 2.2.1: Utwórz service do indexowania

```python
# backend/app/services/elasticsearch_indexing_service.py

import logging
from datetime import datetime
from elasticsearch import AsyncElasticsearch
from app.core.elasticsearch_config import get_elasticsearch_client, ELASTICSEARCH_INDEX
from app.services.embedding_service import generate_embedding
from app.crud import crud_meetings

logger = logging.getLogger(__name__)

async def index_meeting_document(
    meeting_id: str,
    project_id: str,
    user_id: str,
    title: str,
    content: str,
    content_type: str,
    tags: list[str],
    meeting_datetime: datetime,
    metadata: dict | None = None
) -> str:
    """
    Index a single document to Elasticsearch.

    Args:
        meeting_id: Meeting ID
        content: Text content to index
        content_type: Type of content (transcription, summary, etc.)

    Returns:
        Document ID in Elasticsearch
    """
    client = get_elasticsearch_client()

    try:
        # Generate embedding
        embedding = await generate_embedding(content)

        # Prepare document
        document = {
            "meeting_id": meeting_id,
            "project_id": project_id,
            "user_id": user_id,
            "title": title,
            "content": content,
            "content_type": content_type,
            "tags": tags,
            "meeting_datetime": meeting_datetime,
            "created_at": datetime.utcnow(),
            "embedding": embedding,
            "metadata": metadata or {}
        }

        # Index document
        response = await client.index(
            index=ELASTICSEARCH_INDEX,
            document=document
        )

        logger.info(f"Indexed document {response['_id']} for meeting {meeting_id}")
        return response['_id']

    except Exception as e:
        logger.error(f"Failed to index document: {e}")
        raise
    finally:
        await client.close()

async def delete_meeting_documents(meeting_id: str):
    """Delete all documents for a meeting."""
    client = get_elasticsearch_client()

    try:
        await client.delete_by_query(
            index=ELASTICSEARCH_INDEX,
            body={
                "query": {
                    "term": {"meeting_id": meeting_id}
                }
            }
        )
        logger.info(f"Deleted documents for meeting {meeting_id}")
    finally:
        await client.close()
```

**Test (TDD):**

```python
# backend/tests/unit/services/test_elasticsearch_indexing_service.py

import pytest
from datetime import datetime
from app.services.elasticsearch_indexing_service import (
    index_meeting_document,
    delete_meeting_documents
)

@pytest.mark.asyncio
class TestElasticsearchIndexingService:

    async def test_index_meeting_document_success(self):
        """Test successful document indexing."""
        doc_id = await index_meeting_document(
            meeting_id="test_meeting_1",
            project_id="test_project_1",
            user_id="test_user_1",
            title="Test Meeting",
            content="This is test content",
            content_type="transcription",
            tags=["test"],
            meeting_datetime=datetime.utcnow()
        )

        assert doc_id is not None
        assert isinstance(doc_id, str)

    async def test_delete_meeting_documents(self):
        """Test deleting documents by meeting ID."""
        # First index a document
        await index_meeting_document(
            meeting_id="test_meeting_2",
            project_id="test_project_1",
            user_id="test_user_1",
            title="Test",
            content="Test content",
            content_type="summary",
            tags=[],
            meeting_datetime=datetime.utcnow()
        )

        # Then delete it
        await delete_meeting_documents("test_meeting_2")

        # Verify it's deleted (would need search to verify)
```

---

## 📦 Faza 3: Backend Core (Tydzień 3-4)

### 3.1 Database Models

#### Task 3.1.1: Utwórz modele MongoDB

```python
# backend/app/models/knowledge_base.py

from datetime import datetime, UTC
from pydantic import BaseModel, Field
from .py_object_id import PyObjectId

class MessageSource(BaseModel):
    """Source reference for chat message."""
    meeting_id: str
    meeting_title: str
    content_type: str
    excerpt: str
    relevance_score: float
    timestamp: str | None = None

class ChatMessage(BaseModel):
    """Individual chat message."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    conversation_id: PyObjectId
    role: str  # "user" | "assistant" | "system"
    content: str
    sources: list[MessageSource] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        arbitrary_types_allowed = True

class FilterContext(BaseModel):
    """Filter context for search."""
    project_ids: list[str] = []
    tags: list[str] = []
    date_from: datetime | None = None
    date_to: datetime | None = None

class Conversation(BaseModel):
    """Chat conversation."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    title: str
    filter_context: FilterContext | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        arbitrary_types_allowed = True
```

**Test (TDD):**

```python
# backend/tests/unit/models/test_knowledge_base.py

import pytest
from datetime import datetime
from app.models.knowledge_base import ChatMessage, Conversation, MessageSource, FilterContext
from app.models.py_object_id import PyObjectId

class TestKnowledgeBaseModels:

    def test_chat_message_creation(self):
        """Test ChatMessage model creation."""
        message = ChatMessage(
            user_id=PyObjectId(),
            conversation_id=PyObjectId(),
            role="user",
            content="Test question"
        )

        assert message.role == "user"
        assert message.content == "Test question"
        assert isinstance(message.id, PyObjectId)

    def test_conversation_creation(self):
        """Test Conversation model creation."""
        conv = Conversation(
            user_id=PyObjectId(),
            title="Test Conversation"
        )

        assert conv.title == "Test Conversation"
        assert isinstance(conv.created_at, datetime)
```

### 3.2 CRUD Operations

#### Task 3.2.1: Utwórz CRUD dla konwersacji

```python
# backend/app/crud/crud_knowledge_base.py

import logging
from datetime import datetime, UTC
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.knowledge_base import Conversation, ChatMessage, FilterContext
from app.models.py_object_id import PyObjectId

logger = logging.getLogger(__name__)

# ==================== CONVERSATIONS ====================

async def create_conversation(
    database: AsyncIOMotorDatabase,
    user_id: str,
    title: str,
    filter_context: FilterContext | None = None
) -> Conversation:
    """Create new conversation."""
    conversation_data = {
        "user_id": ObjectId(user_id),
        "title": title,
        "filter_context": filter_context.dict() if filter_context else None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    result = await database["conversations"].insert_one(conversation_data)
    conversation_data["_id"] = result.inserted_id

    logger.info(f"Created conversation {result.inserted_id}")
    return Conversation(**conversation_data)

async def get_user_conversations(
    database: AsyncIOMotorDatabase,
    user_id: str,
    limit: int = 20
) -> list[Conversation]:
    """Get user's recent conversations."""
    cursor = database["conversations"].find(
        {"user_id": ObjectId(user_id)}
    ).sort("updated_at", -1).limit(limit)

    conversations = []
    async for doc in cursor:
        conversations.append(Conversation(**doc))

    return conversations

async def delete_conversation(
    database: AsyncIOMotorDatabase,
    conversation_id: str
) -> bool:
    """Delete conversation and all its messages."""
    # Delete conversation
    result = await database["conversations"].delete_one(
        {"_id": ObjectId(conversation_id)}
    )

    # Delete all messages
    await database["chat_messages"].delete_many(
        {"conversation_id": ObjectId(conversation_id)}
    )

    return result.deleted_count > 0

# ==================== MESSAGES ====================

async def create_message(
    database: AsyncIOMotorDatabase,
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None
) -> ChatMessage:
    """Create new chat message."""
    message_data = {
        "user_id": ObjectId(user_id),
        "conversation_id": ObjectId(conversation_id),
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": datetime.now(UTC)
    }

    result = await database["chat_messages"].insert_one(message_data)
    message_data["_id"] = result.inserted_id

    # Update conversation timestamp
    await database["conversations"].update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"updated_at": datetime.now(UTC)}}
    )

    return ChatMessage(**message_data)

async def get_conversation_messages(
    database: AsyncIOMotorDatabase,
    conversation_id: str
) -> list[ChatMessage]:
    """Get all messages from conversation."""
    cursor = database["chat_messages"].find(
        {"conversation_id": ObjectId(conversation_id)}
    ).sort("created_at", 1)

    messages = []
    async for doc in cursor:
        messages.append(ChatMessage(**doc))

    return messages
```

**Test (TDD):**

```python
# backend/tests/unit/crud/test_crud_knowledge_base.py

import pytest
from unittest.mock import AsyncMock
from app.crud import crud_knowledge_base

@pytest.mark.asyncio
class TestKnowledgeBaseCRUD:

    async def test_create_conversation(self):
        """Test creating new conversation."""
        db_mock = AsyncMock()
        db_mock["conversations"].insert_one.return_value.inserted_id = "test_id"

        conv = await crud_knowledge_base.create_conversation(
            db_mock,
            user_id="user_123",
            title="Test Chat"
        )

        assert conv.title == "Test Chat"
        db_mock["conversations"].insert_one.assert_awaited_once()

    async def test_create_message(self):
        """Test creating chat message."""
        db_mock = AsyncMock()
        db_mock["chat_messages"].insert_one.return_value.inserted_id = "msg_123"

        message = await crud_knowledge_base.create_message(
            db_mock,
            user_id="user_123",
            conversation_id="conv_123",
            role="user",
            content="Test question"
        )

        assert message.content == "Test question"
        assert message.role == "user"
```

### 3.3 Hybrid Search Implementation

#### Task 3.3.1: Implementuj hybrid search

```python
# backend/app/services/elasticsearch_search_service.py

import logging
from elasticsearch import AsyncElasticsearch
from app.core.elasticsearch_config import get_elasticsearch_client, ELASTICSEARCH_INDEX
from app.services.embedding_service import generate_embedding
from app.models.knowledge_base import FilterContext

logger = logging.getLogger(__name__)

class SearchResult:
    """Search result with scores."""
    def __init__(self, hit: dict):
        self._source = hit["_source"]
        self._score = hit["_score"]

    @property
    def meeting_id(self) -> str:
        return self._source["meeting_id"]

    @property
    def meeting_title(self) -> str:
        return self._source["title"]

    @property
    def content(self) -> str:
        return self._source["content"]

    @property
    def content_type(self) -> str:
        return self._source["content_type"]

    @property
    def score(self) -> float:
        return self._score

    @property
    def metadata(self) -> dict:
        return self._source.get("metadata", {})

async def hybrid_search(
    query: str,
    user_id: str,
    filters: FilterContext | None = None,
    top_k: int = 10
) -> list[SearchResult]:
    """
    Perform hybrid search (semantic + keyword).

    Combines:
    - Semantic search using embeddings (KNN)
    - Keyword search using BM25

    Args:
        query: User's search query
        user_id: Filter to user's documents
        filters: Additional filters
        top_k: Number of results

    Returns:
        List of SearchResult objects
    """
    client = get_elasticsearch_client()

    try:
        # 1. Generate query embedding
        query_embedding = await generate_embedding(query)

        # 2. Build query
        must_clauses = [
            {"term": {"user_id": user_id}}
        ]

        # Apply filters
        if filters:
            if filters.project_ids:
                must_clauses.append({
                    "terms": {"project_id": filters.project_ids}
                })
            if filters.tags:
                must_clauses.append({
                    "terms": {"tags": filters.tags}
                })
            if filters.date_from or filters.date_to:
                date_range = {}
                if filters.date_from:
                    date_range["gte"] = filters.date_from
                if filters.date_to:
                    date_range["lte"] = filters.date_to
                must_clauses.append({
                    "range": {"meeting_datetime": date_range}
                })

        # 3. Hybrid query
        search_query = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "should": [
                        # Semantic search
                        {
                            "script_score": {
                                "query": {"match_all": {}},
                                "script": {
                                    "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                    "params": {"query_vector": query_embedding}
                                },
                                "boost": 1.0
                            }
                        },
                        # Keyword search (BM25)
                        {
                            "multi_match": {
                                "query": query,
                                "fields": ["title^3", "content^2", "tags^2"],
                                "type": "best_fields",
                                "boost": 1.0
                            }
                        }
                    ],
                    "minimum_should_match": 1
                }
            },
            "size": top_k
        }

        # 4. Execute search
        response = await client.search(
            index=ELASTICSEARCH_INDEX,
            body=search_query
        )

        # 5. Parse results
        results = [SearchResult(hit) for hit in response["hits"]["hits"]]

        logger.info(f"Hybrid search returned {len(results)} results")
        return results

    except Exception as e:
        logger.error(f"Hybrid search failed: {e}")
        raise
    finally:
        await client.close()
```

**Test (TDD):**

```python
# backend/tests/unit/services/test_elasticsearch_search_service.py

import pytest
from unittest.mock import AsyncMock, patch
from app.services.elasticsearch_search_service import hybrid_search, SearchResult

@pytest.mark.asyncio
class TestElasticsearchSearchService:

    @patch('app.services.elasticsearch_search_service.get_elasticsearch_client')
    @patch('app.services.elasticsearch_search_service.generate_embedding')
    async def test_hybrid_search_success(self, mock_embed, mock_client):
        """Test successful hybrid search."""
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
                            "content": "Test content",
                            "content_type": "transcription",
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

        assert len(results) == 1
        assert results[0].meeting_id == "meeting_1"
        assert results[0].score == 0.95
```

---

## ⏱️ Kontynuacja w kolejnych fazach...

### Pozostałe fazy (high-level):

**Faza 4: RAG & Streaming (Tydzień 5)**

- Task 4.1: Integracja z Ollama
- Task 4.2: RAG prompt builder
- Task 4.3: Streaming endpoint
- Task 4.4: API endpoints dla chat

**Faza 5: Frontend Base (Tydzień 6)**

- Task 5.1: Page component
- Task 5.2: Sidebar component
- Task 5.3: Chat area component
- Task 5.4: Message components

**Faza 6: Frontend Integration (Tydzień 7)**

- Task 6.1: Custom hooks
- Task 6.2: API integration
- Task 6.3: WebSocket streaming
- Task 6.4: State management

**Faza 7: Testing & Polish (Tydzień 8-9)**

- Task 7.1: Integration tests
- Task 7.2: E2E tests
- Task 7.3: Performance optimization
- Task 7.4: UI/UX polish

---

## 📊 Progress Tracking

### Checklist

#### Infrastructure (Faza 1-2)

- [ ] Elasticsearch Docker setup
- [ ] Elasticsearch client service
- [ ] Index mapping created
- [ ] Embedding service implemented
- [ ] Indexing service implemented
- [ ] All unit tests passing

#### Backend (Faza 3-4)

- [ ] MongoDB models created
- [ ] CRUD operations implemented
- [ ] Hybrid search working
- [ ] RAG integration complete
- [ ] Streaming endpoint working
- [ ] All API tests passing

#### Frontend (Faza 5-6)

- [ ] Page layout complete
- [ ] Sidebar with filters
- [ ] Chat area functional
- [ ] Message components styled
- [ ] Streaming working
- [ ] State management complete

#### Testing (Faza 7)

- [ ] Unit tests >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] UI/UX reviewed

---

## 🚀 Quick Start Commands

```bash
# 1. Setup Elasticsearch
docker-compose -f docker-compose.dev.yml up elasticsearch -d

# 2. Initialize index
cd backend
poetry run python scripts/init_elasticsearch.py

# 3. Run tests
poetry run pytest tests/unit/services/test_elasticsearch_* -v

# 4. Start development
docker-compose -f docker-compose.dev.yml up --build
```

---

## 📝 Notes & Tips

### Development Tips

1. **TDD is mandatory** - Write tests FIRST
2. **Use type hints** - All functions must be typed
3. **Log everything** - Use structured logging
4. **Mock external services** - Don't hit real Elasticsearch in unit tests
5. **Use fixtures** - Reuse test setup with pytest fixtures

### Common Pitfalls

- ❌ Don't forget to close Elasticsearch client
- ❌ Don't index without generating embeddings
- ❌ Don't skip filters validation
- ❌ Don't hardcode dimensions (use 384)
- ❌ Don't forget async/await

### Performance Considerations

- Cache embedding model (lru_cache)
- Batch process when indexing multiple documents
- Use connection pooling for Elasticsearch
- Limit search results (default 10)
- Implement pagination for large result sets

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-01  
**Status**: 📋 Ready for Implementation  
**Next Step**: Start with Task 1.1.1 - Elasticsearch Docker Setup
