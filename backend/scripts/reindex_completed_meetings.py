"""Script to reindex completed meetings that failed to index."""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Force localhost for services when running from host machine
# Must set BEFORE any imports that read these at module level
os.environ["ELASTICSEARCH_URL"] = "http://localhost:9200"
os.environ["MONGO_DETAILS"] = "mongodb://localhost:27017"
os.environ["OLLAMA_HOST"] = "http://localhost:11434"

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGO_DETAILS, DATABASE_NAME
from app.models.meeting import Meeting
from app.services.meeting_indexing_service import index_meeting_to_knowledge_base
from app.models.enums.processing_stage import ProcessingStage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def reindex_completed_meetings():
    """Reindex all completed meetings that are not indexed."""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_DETAILS)
    db = client[DATABASE_NAME]
    
    try:
        # Find all completed meetings
        cursor = db.meetings.find({
            "processing_status.current_stage": ProcessingStage.COMPLETED.value
        })
        
        meetings_data = await cursor.to_list(length=None)
        logger.info(f"Found {len(meetings_data)} completed meetings")
        
        indexed_count = 0
        failed_count = 0
        
        for meeting_data in meetings_data:
            try:
                meeting = Meeting(**meeting_data)
                logger.info(f"Reindexing meeting: {meeting.title} ({meeting.id})")
                
                success = await index_meeting_to_knowledge_base(meeting)
                
                if success:
                    indexed_count += 1
                    logger.info(f"✓ Successfully indexed: {meeting.title}")
                else:
                    failed_count += 1
                    logger.warning(f"✗ Failed to index: {meeting.title}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"✗ Error indexing meeting {meeting_data.get('title')}: {e}")
        
        logger.info(f"\n=== Reindexing Summary ===")
        logger.info(f"Total meetings: {len(meetings_data)}")
        logger.info(f"Successfully indexed: {indexed_count}")
        logger.info(f"Failed: {failed_count}")
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(reindex_completed_meetings())
