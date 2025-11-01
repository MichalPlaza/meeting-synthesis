"""Unit tests for Elasticsearch configuration."""

import pytest
from app.core.elasticsearch_config import (
    get_elasticsearch_client,
    close_elasticsearch_client,
    ELASTICSEARCH_URL,
    ELASTICSEARCH_INDEX,
)


@pytest.mark.asyncio
class TestElasticsearchConfig:
    """Tests for Elasticsearch client configuration."""

    async def test_get_client_creates_instance(self):
        """Test that client is created successfully."""
        client = get_elasticsearch_client()
        assert client is not None
        await close_elasticsearch_client(client)

    async def test_client_ping_success(self):
        """Test client can ping Elasticsearch.

        Note: This test requires Elasticsearch to be running.
        It will be skipped in CI if ES is not available.
        """
        client = get_elasticsearch_client()

        try:
            result = await client.ping()
            assert result is True
        except Exception:
            pytest.skip("Elasticsearch not available")
        finally:
            await close_elasticsearch_client(client)

    async def test_close_client(self):
        """Test client closes without errors."""
        client = get_elasticsearch_client()
        await close_elasticsearch_client(client)
        # Should not raise any exceptions

    def test_configuration_values(self):
        """Test configuration values are set correctly."""
        assert ELASTICSEARCH_URL is not None
        assert ELASTICSEARCH_INDEX is not None
        assert isinstance(ELASTICSEARCH_URL, str)
        assert isinstance(ELASTICSEARCH_INDEX, str)
