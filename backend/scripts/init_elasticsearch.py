"""Initialize Elasticsearch index for Knowledge Base.

This script creates the index with the proper mapping if it doesn't exist,
or recreates it if it already exists (useful for development).

Usage:
    poetry run python backend/scripts/init_elasticsearch.py
"""

import asyncio
import sys
import os
import logging
from pathlib import Path

# Force localhost for services when running from host machine
# Must set BEFORE any imports that read these at module level
os.environ["ELASTICSEARCH_URL"] = "http://localhost:9200"
os.environ["MONGO_DETAILS"] = "mongodb://localhost:27017"

# Add backend to path so we can import app modules
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.core.elasticsearch_config import (  # noqa: E402
    get_elasticsearch_client,
    close_elasticsearch_client,
    ELASTICSEARCH_INDEX,
)
from app.services.elasticsearch_mapping import KNOWLEDGE_BASE_MAPPING  # noqa: E402

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def init_index() -> None:
    """Initialize Elasticsearch index with mapping."""
    client = get_elasticsearch_client()

    try:
        # Check if index exists
        exists = await client.indices.exists(index=ELASTICSEARCH_INDEX)

        if exists:
            logger.warning(
                f"Index '{ELASTICSEARCH_INDEX}' already exists. Deleting..."
            )
            await client.indices.delete(index=ELASTICSEARCH_INDEX)
            logger.info(f"Deleted existing index '{ELASTICSEARCH_INDEX}'")

        # Create index with mapping
        logger.info(f"Creating index '{ELASTICSEARCH_INDEX}'...")
        await client.indices.create(index=ELASTICSEARCH_INDEX, body=KNOWLEDGE_BASE_MAPPING)

        logger.info(f"✅ Index '{ELASTICSEARCH_INDEX}' created successfully!")

        # Verify index was created
        health = await client.cluster.health(index=ELASTICSEARCH_INDEX)
        logger.info(f"Index health: {health['status']}")

    except Exception as e:
        logger.error(f"❌ Error initializing index: {e}")
        raise
    finally:
        await close_elasticsearch_client(client)


if __name__ == "__main__":
    logger.info("🚀 Starting Elasticsearch index initialization...")
    asyncio.run(init_index())
    logger.info("✨ Initialization complete!")
