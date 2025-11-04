"""Elasticsearch client configuration.

This module provides async Elasticsearch client initialization and management.
"""

import os
import logging
from elasticsearch import AsyncElasticsearch

logger = logging.getLogger(__name__)

# Configuration from environment
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
ELASTICSEARCH_INDEX = os.getenv(
    "ELASTICSEARCH_INDEX_NAME", "meetings_knowledge_base"
)


def get_elasticsearch_client() -> AsyncElasticsearch:
    """Get Elasticsearch client instance.

    Returns:
        AsyncElasticsearch: Configured async client instance.
    """
    logger.info(f"Creating Elasticsearch client for {ELASTICSEARCH_URL}")
    return AsyncElasticsearch(
        [ELASTICSEARCH_URL], verify_certs=False, request_timeout=30
    )


async def close_elasticsearch_client(client: AsyncElasticsearch) -> None:
    """Close Elasticsearch client connection.

    Args:
        client: Elasticsearch client to close.
    """
    logger.info("Closing Elasticsearch client")
    await client.close()
