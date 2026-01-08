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
    def source(self) -> dict:
        """Get the full source document."""
        return self._source

    @property
    def metadata(self) -> dict:
        """Get additional metadata."""
        return self._source.get("metadata", {})


async def hybrid_search(
    query: str,
    project_ids: list[str],
    filters: FilterContext | None = None,
    top_k: int = 10,
) -> list[SearchResult]:
    """Perform hybrid search combining semantic and keyword search.

    Combines:
    - Semantic search using embeddings (KNN with cosine similarity)
    - Keyword search using BM25

    Args:
        query: User's search query.
        project_ids: List of project IDs the user has access to.
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

        # 2. Build base query with project filter
        must_clauses = [{"terms": {"project_id": project_ids}}]

        # 3. Apply additional filters
        if filters:
            if filters.project_ids:
                # Intersect with user's accessible projects
                allowed_ids = [p for p in filters.project_ids if p in project_ids]
                if allowed_ids:
                    must_clauses = [{"terms": {"project_id": allowed_ids}}]
                else:
                    # No matching projects, return empty
                    return []

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


class DashboardSearchResult:
    """Search result with highlights for dashboard display."""

    def __init__(self, hit: dict):
        """Initialize from Elasticsearch hit."""
        self._source = hit["_source"]
        self._score = hit.get("_score", 0)
        self._highlight = hit.get("highlight", {})

    @property
    def meeting_id(self) -> str:
        return self._source["meeting_id"]

    @property
    def meeting_title(self) -> str:
        return self._source["title"]

    @property
    def project_id(self) -> str:
        return self._source.get("project_id", "")

    @property
    def tags(self) -> list[str]:
        return self._source.get("tags", [])

    @property
    def meeting_datetime(self) -> str:
        return self._source.get("meeting_datetime", "")

    @property
    def content_type(self) -> str:
        return self._source.get("content_type", "")

    @property
    def score(self) -> float:
        return self._score

    @property
    def highlights(self) -> list[str]:
        """Get highlighted snippets."""
        snippets = []
        for field in ["content", "title"]:
            if field in self._highlight:
                snippets.extend(self._highlight[field])
        return snippets[:3]  # Return top 3 snippets

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        return {
            "meeting_id": self.meeting_id,
            "meeting_title": self.meeting_title,
            "project_id": self.project_id,
            "tags": self.tags,
            "meeting_datetime": self.meeting_datetime,
            "content_type": self.content_type,
            "score": self.score,
            "highlights": self.highlights,
        }


class SearchFacets:
    """Facet counts for filtering."""

    def __init__(self, aggregations: dict):
        self._aggs = aggregations

    @property
    def projects(self) -> list[dict]:
        """Get project facets with unique meeting counts."""
        buckets = self._aggs.get("projects", {}).get("buckets", [])
        return [
            {
                "id": b["key"],
                "count": b.get("unique_meetings", {}).get("value", b["doc_count"])
            }
            for b in buckets
        ]

    @property
    def tags(self) -> list[dict]:
        """Get tag facets with unique meeting counts."""
        buckets = self._aggs.get("tags", {}).get("buckets", [])
        return [
            {
                "name": b["key"],
                "count": b.get("unique_meetings", {}).get("value", b["doc_count"])
            }
            for b in buckets
        ]

    def to_dict(self) -> dict:
        return {
            "projects": self.projects,
            "tags": self.tags,
        }


async def dashboard_search(
    query: str,
    project_ids: list[str],
    tags: list[str] | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[DashboardSearchResult], int, SearchFacets]:
    """Perform search with highlights and facets for dashboard.

    Args:
        query: Search query (can be empty for browse mode).
        project_ids: List of project IDs the user has access to.
        tags: Filter by tags.
        date_from: Filter by start date (ISO format).
        date_to: Filter by end date (ISO format).
        page: Page number (1-indexed).
        page_size: Results per page.

    Returns:
        Tuple of (results, total_count, facets).
    """
    client = get_elasticsearch_client()

    try:
        # Build filter clauses - filter by user's accessible projects
        filter_clauses = [{"terms": {"project_id": project_ids}}]

        if tags:
            filter_clauses.append({"terms": {"tags": tags}})

        if date_from or date_to:
            date_range = {}
            if date_from:
                date_range["gte"] = date_from
            if date_to:
                date_range["lte"] = date_to
            filter_clauses.append({"range": {"meeting_datetime": date_range}})

        # Build query based on whether search term is provided
        if query and query.strip():
            # Generate embedding for semantic search
            query_embedding = await generate_embedding(query)

            search_query = {
                "bool": {
                    "filter": filter_clauses,
                    "should": [
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
            }
        else:
            # Browse mode - no search query, just filters
            search_query = {
                "bool": {
                    "filter": filter_clauses,
                }
            }

        # Calculate pagination
        from_offset = (page - 1) * page_size

        # Build full search body with highlighting and aggregations
        search_body = {
            "query": search_query,
            "from": from_offset,
            "size": page_size,
            "sort": [
                {"_score": {"order": "desc"}},
                {"meeting_datetime": {"order": "desc"}},
            ],
            "highlight": {
                "fields": {
                    "content": {
                        "fragment_size": 150,
                        "number_of_fragments": 3,
                        "pre_tags": ["<mark>"],
                        "post_tags": ["</mark>"],
                    },
                    "title": {
                        "fragment_size": 100,
                        "number_of_fragments": 1,
                        "pre_tags": ["<mark>"],
                        "post_tags": ["</mark>"],
                    },
                },
            },
            "aggs": {
                "projects": {
                    "terms": {"field": "project_id", "size": 50},
                    "aggs": {
                        "unique_meetings": {
                            "cardinality": {"field": "meeting_id"}
                        }
                    }
                },
                "tags": {
                    "terms": {"field": "tags", "size": 100},
                    "aggs": {
                        "unique_meetings": {
                            "cardinality": {"field": "meeting_id"}
                        }
                    }
                },
            },
        }

        # Execute search
        logger.debug(f"Executing dashboard search: query='{query[:30] if query else '(empty)'}', page={page}")
        response = await client.search(index=ELASTICSEARCH_INDEX, body=search_body)

        # Parse results
        results = [DashboardSearchResult(hit) for hit in response["hits"]["hits"]]
        total_count = response["hits"]["total"]["value"]
        facets = SearchFacets(response.get("aggregations", {}))

        logger.info(f"Dashboard search returned {len(results)} of {total_count} results")
        return results, total_count, facets

    except Exception as e:
        logger.error(f"Dashboard search failed: {e}", exc_info=True)
        raise
    finally:
        await client.close()
