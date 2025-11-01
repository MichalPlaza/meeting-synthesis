"""Unit tests for embedding service."""

import pytest
import numpy as np
from app.services.embedding_service import (
    generate_embedding,
    generate_embeddings_batch,
    get_embedding_model,
    MODEL_NAME,
)


@pytest.mark.asyncio
class TestEmbeddingService:
    """Tests for embedding generation service."""

    async def test_generate_embedding_success(self):
        """Test embedding generation for valid text."""
        text = "This is a test meeting transcript"
        embedding = await generate_embedding(text)

        assert isinstance(embedding, list)
        assert len(embedding) == 384  # all-MiniLM-L6-v2 produces 384-dim vectors
        assert all(isinstance(x, float) for x in embedding)

    async def test_generate_embedding_empty_text(self):
        """Test embedding generation fails for empty text."""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            await generate_embedding("")

    async def test_generate_embedding_none_text(self):
        """Test embedding generation fails for None text."""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            await generate_embedding(None)

    async def test_generate_embedding_whitespace_only(self):
        """Test embedding generation fails for whitespace-only text."""
        with pytest.raises(ValueError, match="Text cannot be empty"):
            await generate_embedding("   \n\t  ")

    async def test_generate_embeddings_batch(self):
        """Test batch embedding generation."""
        texts = [
            "First meeting transcript",
            "Second meeting summary",
            "Third meeting action item"
        ]
        embeddings = await generate_embeddings_batch(texts)

        assert len(embeddings) == 3
        assert all(len(emb) == 384 for emb in embeddings)
        assert all(isinstance(emb, list) for emb in embeddings)

    async def test_generate_embeddings_batch_empty_list(self):
        """Test batch generation fails for empty list."""
        with pytest.raises(ValueError, match="Texts list cannot be empty"):
            await generate_embeddings_batch([])

    async def test_generate_embeddings_batch_all_empty(self):
        """Test batch generation fails when all texts are empty."""
        with pytest.raises(ValueError, match="All texts are empty"):
            await generate_embeddings_batch(["", "  ", "\n"])

    async def test_embedding_similarity(self):
        """Test similar texts have similar embeddings."""
        text1 = "The marketing team discussed the budget allocation"
        text2 = "Marketing team talked about budget distribution"
        text3 = "Software development sprint planning meeting"

        emb1 = await generate_embedding(text1)
        emb2 = await generate_embedding(text2)
        emb3 = await generate_embedding(text3)

        # Calculate cosine similarity
        def cosine_similarity(a: list[float], b: list[float]) -> float:
            a_arr = np.array(a)
            b_arr = np.array(b)
            return np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr))

        sim_1_2 = cosine_similarity(emb1, emb2)
        sim_1_3 = cosine_similarity(emb1, emb3)

        # Similar texts (1 and 2) should have higher similarity than dissimilar (1 and 3)
        assert sim_1_2 > sim_1_3
        assert sim_1_2 > 0.7  # Threshold for similar texts

    async def test_embedding_consistency(self):
        """Test same text produces same embedding."""
        text = "Consistent test text"
        
        emb1 = await generate_embedding(text)
        emb2 = await generate_embedding(text)

        # Should be identical (or very close due to floating point)
        assert len(emb1) == len(emb2)
        for i in range(len(emb1)):
            assert abs(emb1[i] - emb2[i]) < 1e-6

    def test_get_embedding_model_cached(self):
        """Test model is cached and reused."""
        model1 = get_embedding_model()
        model2 = get_embedding_model()

        # Should be the same instance (cached)
        assert model1 is model2

    def test_model_configuration(self):
        """Test model name is correct."""
        assert MODEL_NAME == "all-MiniLM-L6-v2"
