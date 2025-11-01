"""Embedding generation service using Sentence Transformers.

This module provides functions to generate embeddings for text content
using the all-MiniLM-L6-v2 model (384 dimensions).
"""

import logging
from functools import lru_cache
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Model name - produces 384-dimensional embeddings
MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Load and cache embedding model.

    The model is cached to avoid reloading on every call.
    Model is downloaded to ~/.cache/torch/sentence_transformers/

    Returns:
        SentenceTransformer: Loaded model instance.
    """
    logger.info(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    logger.info(f"Embedding model loaded successfully (dims: {model.get_sentence_embedding_dimension()})")
    return model


async def generate_embedding(text: str) -> list[float]:
    """Generate embedding vector for text.

    Args:
        text: Input text to embed.

    Returns:
        List of 384 floats representing the embedding.

    Raises:
        ValueError: If text is empty or None.
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    model = get_embedding_model()
    
    # Generate embedding (synchronous operation)
    # Note: sentence-transformers doesn't have async API
    embedding = model.encode(text, convert_to_tensor=False, show_progress_bar=False)
    
    logger.debug(f"Generated embedding for text (length: {len(text)} chars)")
    return embedding.tolist()


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in batch.

    Batch processing is more efficient than individual calls.

    Args:
        texts: List of texts to embed.

    Returns:
        List of embedding vectors.

    Raises:
        ValueError: If texts list is empty.
    """
    if not texts:
        raise ValueError("Texts list cannot be empty")

    # Filter out empty texts
    valid_texts = [t for t in texts if t and t.strip()]
    if not valid_texts:
        raise ValueError("All texts are empty")

    model = get_embedding_model()
    
    # Batch encode with optimal batch size
    embeddings = model.encode(
        valid_texts,
        convert_to_tensor=False,
        batch_size=32,
        show_progress_bar=False
    )
    
    logger.info(f"Generated {len(valid_texts)} embeddings in batch")
    return [emb.tolist() for emb in embeddings]
