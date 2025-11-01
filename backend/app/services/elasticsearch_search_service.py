"""Elasticsearch hybrid search service combining semantic and keyword search."""

import logging
from elasticsearch import AsyncElasticsearch

from app.core.elasticsearch_config import get_elasticsearch_client, ELASTICSEARCH_INDEX
from app.services.embedding_service import generate_embedding
from app.models.knowledge_base import FilterContext

logger = logging.getLogger(__name__)


class SearchResult:
    """Search result with scores and metadata.

    Wraps Elasticsearch hit and provides convenient property access.
    """

    def __init__(self, hit: dict):
        """Initialize SearchResult from Elasticsearch hit.

        Args:
            hit: Elasticsearch hit dictionary with _source and _score.
        """
        self._source = hit["_source"]
        self._score = hit["_score"]

    @property
    def meeting_id(self) -> str:
        """Get meeting ID."""
        return self._source["meeting_id"]

    @property
    def meeting_title(self) -> str:
        """Get meeting title."""
        return self._source["title"]

    @property
    def content(self) -> str:
        """Get content text."""
        return self._source["content"]

    @property
    def content_type(self) -> str:
        """Get content type (transcription, summary, etc.)."""
        return self._source["content_type"]

    @property
    def score(self) -> float:
        """Get relevance score."""
        return self._score

    @property
    def metadata(self) -> dict:
        """Get additional metadata."""
        return self._source.get("metadata", {})


async def hybrid_search(
    query: str,
    user_id: str,
    filters: FilterContext | None = None,
    top_k: int = 10,
) -> list[SearchResult]:
    """Perform hybrid search combining semantic and keyword search.

    Combines:
    - Semantic search using embeddings (KNN with cosine similarity)
    - Keyword search using BM25

    Args:
        query: User's search query.
        user_id: Filter to user's accessible documents.
        filters: Additional filters (project, tags, dates).
        top_k: Number of results to return.

    Returns:
        List of SearchResult objects sorted by relevance.

    Raises:
        Exception: If search fails.
    """
    client = get_elasticsearch_client()

    try:
        # 1. Generate query embedding
        query_embedding = await generate_embedding(query)

        # 2. Build base query with user filter
        must_clauses = [{"term": {"user_id": user_id}}]

        # 3. Apply additional filters
        if filters:
            if filters.project_ids:
                must_clauses.append({"terms": {"project_id": filters.project_ids}})

            if filters.tags:
                must_clauses.append({"terms": {"tags": filters.tags}})

            if filters.date_from or filters.date_to:
                date_range = {}
                if filters.date_from:
                    date_range["gte"] = filters.date_from
                if filters.date_to:
                    date_range["lte"] = filters.date_to
                must_clauses.append({"range": {"meeting_datetime": date_range}})

        # 4. Build hybrid query
        search_query = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "should": [
                        # Semantic search using embeddings
                        {
                            "script_score": {
                                "query": {"match_all": {}},
                                "script": {
                                    "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                    "params": {"query_vector": query_embedding},
                                },
                                "boost": 1.0,
                            }
                        },
                        # Keyword search using BM25
                        {
                            "multi_match": {
                                "query": query,
                                "fields": ["title^3", "content^2", "tags^2"],
                                "type": "best_fields",
                                "boost": 1.0,
                            }
                        },
                    ],
                    "minimum_should_match": 1,
                }
            },
            "size": top_k,
        }

        # 5. Execute search
        logger.debug(f"Executing hybrid search for query: {query[:50]}...")
        response = await client.search(index=ELASTICSEARCH_INDEX, body=search_query)

        # 6. Parse results
        results = [SearchResult(hit) for hit in response["hits"]["hits"]]

        logger.info(
            f"Hybrid search returned {len(results)} results for query: {query[:50]}"
        )
        return results

    except Exception as e:
        logger.error(f"Hybrid search failed: {e}", exc_info=True)
        raise
    finally:
        await client.close()
