"""Elasticsearch client configuration.

This module provides async Elasticsearch client initialization and management.
"""

import os
import ssl
import logging
from elasticsearch import AsyncElasticsearch

logger = logging.getLogger(__name__)

# Configuration from environment
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch:9200")
ELASTICSEARCH_INDEX = os.getenv(
    "ELASTICSEARCH_INDEX_NAME", "meetings_knowledge_base"
)

# SSL configuration
# In production, set ELASTICSEARCH_VERIFY_CERTS=true and use HTTPS
ELASTICSEARCH_VERIFY_CERTS = os.getenv("ELASTICSEARCH_VERIFY_CERTS", "false").lower() == "true"
ELASTICSEARCH_CA_CERTS = os.getenv("ELASTICSEARCH_CA_CERTS", None)


def get_elasticsearch_client() -> AsyncElasticsearch:
    """Get Elasticsearch client instance.

    SSL verification is controlled by ELASTICSEARCH_VERIFY_CERTS environment variable.
    For production, ensure:
    - ELASTICSEARCH_URL uses https://
    - ELASTICSEARCH_VERIFY_CERTS=true
    - Optionally set ELASTICSEARCH_CA_CERTS to custom CA certificate path

    Returns:
        AsyncElasticsearch: Configured async client instance.
    """
    use_ssl = ELASTICSEARCH_URL.startswith("https")

    # Build SSL context if using HTTPS
    ssl_context = None
    if use_ssl and ELASTICSEARCH_VERIFY_CERTS:
        ssl_context = ssl.create_default_context()
        if ELASTICSEARCH_CA_CERTS:
            ssl_context.load_verify_locations(ELASTICSEARCH_CA_CERTS)
        logger.info("Elasticsearch SSL verification enabled")
    elif use_ssl and not ELASTICSEARCH_VERIFY_CERTS:
        logger.warning(
            "Elasticsearch SSL verification is DISABLED. "
            "This is insecure and should only be used in development!"
        )

    logger.info(f"Creating Elasticsearch client for {ELASTICSEARCH_URL}")

    return AsyncElasticsearch(
        [ELASTICSEARCH_URL],
        verify_certs=ELASTICSEARCH_VERIFY_CERTS,
        ssl_context=ssl_context,
        request_timeout=30,
        retry_on_timeout=True,
        max_retries=3,
    )


async def close_elasticsearch_client(client: AsyncElasticsearch) -> None:
    """Close Elasticsearch client connection.

    Args:
        client: Elasticsearch client to close.
    """
    logger.info("Closing Elasticsearch client")
    await client.close()
