"""Unit tests for Elasticsearch configuration."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.core.elasticsearch_config import (
    get_elasticsearch_client,
    close_elasticsearch_client,
    elasticsearch_client,
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

    async def test_configuration_values(self):
        """Test configuration values are set correctly."""
        assert ELASTICSEARCH_URL is not None
        assert ELASTICSEARCH_INDEX is not None
        assert isinstance(ELASTICSEARCH_URL, str)
        assert isinstance(ELASTICSEARCH_INDEX, str)


@pytest.mark.asyncio
class TestElasticsearchContextManager:
    """Tests for elasticsearch_client context manager."""

    async def test_context_manager_yields_client(self):
        """Test that context manager yields a client."""
        with patch("app.core.elasticsearch_config.get_elasticsearch_client") as mock_get, \
             patch("app.core.elasticsearch_config.close_elasticsearch_client", new_callable=AsyncMock) as mock_close:

            mock_client = MagicMock()
            mock_get.return_value = mock_client

            async with elasticsearch_client() as client:
                assert client == mock_client

            mock_get.assert_called_once()
            mock_close.assert_called_once_with(mock_client)

    async def test_context_manager_closes_on_success(self):
        """Test client is closed after successful operation."""
        with patch("app.core.elasticsearch_config.get_elasticsearch_client") as mock_get, \
             patch("app.core.elasticsearch_config.close_elasticsearch_client", new_callable=AsyncMock) as mock_close:

            mock_client = MagicMock()
            mock_client.search = AsyncMock(return_value={"hits": {"hits": []}})
            mock_get.return_value = mock_client

            async with elasticsearch_client() as client:
                await client.search()

            mock_close.assert_called_once_with(mock_client)

    async def test_context_manager_closes_on_exception(self):
        """Test client is closed even when exception occurs."""
        with patch("app.core.elasticsearch_config.get_elasticsearch_client") as mock_get, \
             patch("app.core.elasticsearch_config.close_elasticsearch_client", new_callable=AsyncMock) as mock_close:

            mock_client = MagicMock()
            mock_client.search = AsyncMock(side_effect=Exception("Search failed"))
            mock_get.return_value = mock_client

            with pytest.raises(Exception, match="Search failed"):
                async with elasticsearch_client() as client:
                    await client.search()

            # Client should still be closed
            mock_close.assert_called_once_with(mock_client)

    async def test_context_manager_multiple_operations(self):
        """Test multiple operations within context manager."""
        with patch("app.core.elasticsearch_config.get_elasticsearch_client") as mock_get, \
             patch("app.core.elasticsearch_config.close_elasticsearch_client", new_callable=AsyncMock) as mock_close:

            mock_client = MagicMock()
            mock_client.search = AsyncMock(return_value={"hits": {"hits": []}})
            mock_client.index = AsyncMock(return_value={"_id": "doc123"})
            mock_client.delete = AsyncMock(return_value={"deleted": 1})
            mock_get.return_value = mock_client

            async with elasticsearch_client() as client:
                await client.search()
                await client.index()
                await client.delete()

            # Client should be created once and closed once
            mock_get.assert_called_once()
            mock_close.assert_called_once()
