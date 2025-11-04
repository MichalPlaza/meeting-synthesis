"""Elasticsearch indexing service for Knowledge Base.

This module handles indexing meeting content to Elasticsearch,
including generating embeddings and managing document lifecycle.
"""

import logging
from datetime import datetime, UTC
from app.core.elasticsearch_config import (
    get_elasticsearch_client,
    close_elasticsearch_client,
    ELASTICSEARCH_INDEX,
)
from app.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)


async def index_meeting_document(
    meeting_id: str,
    project_id: str,
    user_id: str,
    title: str,
    content: str,
    content_type: str,
    tags: list[str] | None = None,
    meeting_datetime: datetime | None = None,
    metadata: dict | None = None,
) -> str:
    """Index a single document to Elasticsearch.

    Args:
        meeting_id: Meeting ID.
        project_id: Project ID.
        user_id: User/uploader ID.
        title: Meeting title.
        content: Text content to index.
        content_type: Type of content (transcription, summary, key_topic, etc.).
        tags: Optional list of tags.
        meeting_datetime: Optional meeting datetime.
        metadata: Optional metadata dict.

    Returns:
        Document ID in Elasticsearch.

    Raises:
        Exception: If indexing fails.
    """
    client = get_elasticsearch_client()

    try:
        # Generate embedding for content
        logger.info(f"Generating embedding for meeting {meeting_id}, type: {content_type}")
        embedding = await generate_embedding(content)

        # Prepare document
        document = {
            "meeting_id": meeting_id,
            "project_id": project_id,
            "user_id": user_id,
            "title": title,
            "content": content,
            "content_type": content_type,
            "tags": tags or [],
            "meeting_datetime": meeting_datetime or datetime.now(UTC),
            "created_at": datetime.now(UTC),
            "embedding": embedding,
            "metadata": metadata or {},
        }

        # Index document
        response = await client.index(index=ELASTICSEARCH_INDEX, document=document)

        doc_id = response["_id"]
        logger.info(
            f"✅ Indexed document {doc_id} for meeting {meeting_id} ({content_type})"
        )
        return doc_id

    except Exception as e:
        logger.error(f"❌ Failed to index document for meeting {meeting_id}: {e}")
        raise
    finally:
        await close_elasticsearch_client(client)


async def index_meeting_documents_batch(documents: list[dict]) -> list[str]:
    """Index multiple documents in batch.

    More efficient than individual calls for large numbers of documents.

    Args:
        documents: List of document dicts (same format as index_meeting_document args).

    Returns:
        List of document IDs in Elasticsearch.

    Raises:
        Exception: If batch indexing fails.
    """
    if not documents:
        return []

    client = get_elasticsearch_client()

    try:
        # Prepare bulk operations
        bulk_body = []

        for doc in documents:
            # Generate embedding
            embedding = await generate_embedding(doc["content"])

            # Prepare document
            document = {
                "meeting_id": doc["meeting_id"],
                "project_id": doc["project_id"],
                "user_id": doc["user_id"],
                "title": doc["title"],
                "content": doc["content"],
                "content_type": doc["content_type"],
                "tags": doc.get("tags", []),
                "meeting_datetime": doc.get("meeting_datetime", datetime.now(UTC)),
                "created_at": datetime.now(UTC),
                "embedding": embedding,
                "metadata": doc.get("metadata", {}),
            }

            # Add index operation
            bulk_body.append({"index": {"_index": ELASTICSEARCH_INDEX}})
            bulk_body.append(document)

        # Execute bulk index
        response = await client.bulk(operations=bulk_body)

        # Extract document IDs
        doc_ids = [item["index"]["_id"] for item in response["items"]]

        logger.info(f"✅ Bulk indexed {len(doc_ids)} documents")
        return doc_ids

    except Exception as e:
        logger.error(f"❌ Failed to bulk index documents: {e}")
        raise
    finally:
        await close_elasticsearch_client(client)


async def delete_meeting_documents(meeting_id: str) -> int:
    """Delete all documents for a meeting.

    Args:
        meeting_id: Meeting ID to delete documents for.

    Returns:
        Number of documents deleted.

    Raises:
        Exception: If deletion fails.
    """
    client = get_elasticsearch_client()

    try:
        response = await client.delete_by_query(
            index=ELASTICSEARCH_INDEX, body={"query": {"term": {"meeting_id": meeting_id}}}
        )

        deleted_count = response["deleted"]
        logger.info(f"✅ Deleted {deleted_count} documents for meeting {meeting_id}")
        return deleted_count

    except Exception as e:
        logger.error(f"❌ Failed to delete documents for meeting {meeting_id}: {e}")
        raise
    finally:
        await close_elasticsearch_client(client)


async def get_index_stats() -> dict:
    """Get statistics about the index.

    Returns:
        Dict with detailed index stats including:
        - total_documents: Total number of documents
        - total_meetings: Number of unique meetings
        - by_content_type: Breakdown by content type
        - index_size_bytes: Size in bytes
    """
    client = get_elasticsearch_client()

    try:
        # Get basic index stats
        stats = await client.indices.stats(index=ELASTICSEARCH_INDEX)
        index_stats = stats["indices"][ELASTICSEARCH_INDEX]
        
        # Get aggregations for content type breakdown
        agg_query = {
            "size": 0,
            "aggs": {
                "by_content_type": {
                    "terms": {"field": "content_type.keyword", "size": 20}
                },
                "unique_meetings": {
                    "cardinality": {"field": "meeting_id.keyword"}
                }
            }
        }
        
        agg_result = await client.search(index=ELASTICSEARCH_INDEX, body=agg_query)
        
        # Parse aggregation results
        content_type_breakdown = {}
        for bucket in agg_result["aggregations"]["by_content_type"]["buckets"]:
            content_type_breakdown[bucket["key"]] = bucket["doc_count"]
        
        unique_meetings = agg_result["aggregations"]["unique_meetings"]["value"]
        
        return {
            "total_documents": index_stats["total"]["docs"]["count"],
            "total_meetings": unique_meetings,
            "by_content_type": content_type_breakdown,
            "index_size_bytes": index_stats["total"]["store"]["size_in_bytes"],
            "index_size_mb": round(index_stats["total"]["store"]["size_in_bytes"] / (1024 * 1024), 2),
        }

    except Exception as e:
        logger.error(f"❌ Failed to get index stats: {e}")
        raise
    finally:
        await close_elasticsearch_client(client)
