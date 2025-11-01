"""Elasticsearch index mapping for Knowledge Base.

This module defines the index structure for storing meeting documents
with embeddings for hybrid search (semantic + keyword).
"""

KNOWLEDGE_BASE_MAPPING = {
    "mappings": {
        "properties": {
            # Meeting identifiers
            "meeting_id": {"type": "keyword"},
            "project_id": {"type": "keyword"},
            "user_id": {"type": "keyword"},
            # Title with both text and keyword analyzers
            "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
            # Content with standard analyzer
            "content": {"type": "text", "analyzer": "standard"},
            # Content type (transcription, summary, key_topic, etc.)
            "content_type": {
                "type": "keyword"
                # Possible values: transcription, summary, key_topic,
                # action_item, decision
            },
            # Tags for filtering
            "tags": {"type": "keyword"},
            # Temporal data
            "meeting_datetime": {"type": "date"},
            "created_at": {"type": "date"},
            # Dense vector for semantic search (384 dimensions from all-MiniLM-L6-v2)
            "embedding": {
                "type": "dense_vector",
                "dims": 384,
                "index": True,
                "similarity": "cosine",
            },
            # Additional metadata
            "metadata": {
                "type": "object",
                "properties": {
                    "speaker": {"type": "keyword"},
                    "timestamp": {"type": "keyword"},
                    "confidence": {"type": "float"},
                },
            },
        }
    },
    "settings": {
        # Single shard for development (adjust for production)
        "number_of_shards": 1,
        "number_of_replicas": 0,
        # Custom analyzers
        "analysis": {
            "analyzer": {
                "custom_analyzer": {
                    "type": "standard",
                    "stopwords": "_english_",
                }
            }
        },
    },
}
