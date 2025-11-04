"""Test complete indexing flow: embedding generation + Elasticsearch indexing.

Usage:
    poetry run python backend/scripts/test_indexing_flow.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.elasticsearch_indexing_service import (  # noqa: E402
    index_meeting_document,
)
from app.core.elasticsearch_config import (  # noqa: E402
    get_elasticsearch_client,
    close_elasticsearch_client,
    ELASTICSEARCH_INDEX,
)


async def test_complete_flow():
    """Test complete flow from content to indexed document."""
    print("🚀 Testing complete indexing flow...\n")

    # Test data
    meeting_id = "test_meeting_123"
    project_id = "test_project_456"
    user_id = "test_user_789"
    title = "Marketing Q3 Strategy Meeting"
    content = """
    We discussed the Q3 marketing strategy focusing on three key areas:
    1. Social media campaigns targeting millennials
    2. Content marketing with focus on SEO
    3. Partnership with influencers in tech space
    
    Action items:
    - Sarah to create social media calendar
    - Mike to research potential influencer partnerships
    - Team to review SEO strategy
    """
    content_type = "transcription"
    tags = ["marketing", "Q3-2025", "strategy"]
    meeting_datetime = datetime(2025, 10, 15, 14, 30)

    try:
        # Step 1: Index document (includes embedding generation)
        print("📝 Step 1: Indexing document...")
        doc_id = await index_meeting_document(
            meeting_id=meeting_id,
            project_id=project_id,
            user_id=user_id,
            title=title,
            content=content,
            content_type=content_type,
            tags=tags,
            meeting_datetime=meeting_datetime,
            metadata={"speaker": "Sarah", "confidence": 0.95},
        )
        print(f"✅ Document indexed with ID: {doc_id}\n")

        # Step 2: Verify document exists in Elasticsearch
        print("🔍 Step 2: Verifying document in Elasticsearch...")
        client = get_elasticsearch_client()

        try:
            # Get document by ID
            result = await client.get(index=ELASTICSEARCH_INDEX, id=doc_id)
            doc = result["_source"]

            print(f"✅ Document found!")
            print(f"  - Meeting ID: {doc['meeting_id']}")
            print(f"  - Title: {doc['title']}")
            print(f"  - Content Type: {doc['content_type']}")
            print(f"  - Tags: {doc['tags']}")
            print(f"  - Embedding dims: {len(doc['embedding'])}")
            print(f"  - Content preview: {doc['content'][:100]}...\n")

            # Step 3: Test search by meeting_id
            print("🔍 Step 3: Testing search by meeting_id...")
            search_result = await client.search(
                index=ELASTICSEARCH_INDEX,
                body={"query": {"term": {"meeting_id": meeting_id}}},
            )

            hits = search_result["hits"]["hits"]
            print(f"✅ Found {len(hits)} document(s) for meeting_id: {meeting_id}\n")

            # Step 4: Test text search
            print("🔍 Step 4: Testing keyword search...")
            search_result = await client.search(
                index=ELASTICSEARCH_INDEX,
                body={"query": {"match": {"content": "marketing strategy"}}},
            )

            hits = search_result["hits"]["hits"]
            print(f"✅ Found {len(hits)} document(s) matching 'marketing strategy'")
            if hits:
                print(f"  - Score: {hits[0]['_score']}\n")

            # Step 5: Clean up test document
            print("🧹 Step 5: Cleaning up test document...")
            await client.delete(index=ELASTICSEARCH_INDEX, id=doc_id)
            print("✅ Test document deleted\n")

        finally:
            await close_elasticsearch_client(client)

        print("=" * 60)
        print("🎉 All tests passed! Complete flow working correctly!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback

        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(test_complete_flow())
