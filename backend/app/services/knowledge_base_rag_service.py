"""Knowledge Base RAG (Retrieval-Augmented Generation) service.

This service combines semantic search with LLM generation to provide
contextually-aware answers about meetings and project knowledge.
"""

import os
from typing import AsyncGenerator, Optional
import logging

import ollama

from app.models.knowledge_base import FilterContext, MessageSource
from app.services.elasticsearch_search_service import SearchResult, hybrid_search

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")

# RAG configuration
MAX_SEARCH_RESULTS = int(os.getenv("RAG_MAX_RESULTS", "5"))
MAX_CONTEXT_LENGTH = int(os.getenv("RAG_MAX_CONTEXT_LENGTH", "4000"))


def build_rag_prompt(
    query: str,
    search_results: list[SearchResult],
    max_context_length: int = MAX_CONTEXT_LENGTH,
) -> str:
    """Build RAG prompt with search results as context.
    
    Args:
        query: User's question.
        search_results: Retrieved documents from semantic search.
        max_context_length: Maximum characters for context.
        
    Returns:
        Formatted prompt for LLM.
    """
    if not search_results:
        return f"""You are a helpful meeting assistant. A user asked: "{query}"

However, I could not find any relevant information in the meeting database to answer this question.

Please politely explain that you don't have information about this topic in the available meetings."""

    # Build context from search results
    context_parts = []
    current_length = 0
    
    for result in search_results:
        source = result.source
        
        # Format source information
        meeting_title = source.get("title", "Unknown Meeting")
        content = source.get("content", "")
        content_type = source.get("content_type", "unknown")
        
        # Create context entry
        context_entry = f"""
---
Meeting: {meeting_title}
Type: {content_type}
Content: {content}
---
"""
        
        # Check if adding this would exceed limit
        if current_length + len(context_entry) > max_context_length:
            # Truncate content if needed
            remaining = max_context_length - current_length - 100  # Leave buffer
            if remaining > 100:
                truncated_content = content[:remaining] + "..."
                context_entry = f"""
---
Meeting: {meeting_title}
Type: {content_type}
Content: {truncated_content}
---
"""
                context_parts.append(context_entry)
            break
        
        context_parts.append(context_entry)
        current_length += len(context_entry)
    
    context = "\n".join(context_parts)
    
    # Build final prompt
    prompt = f"""You are a helpful meeting assistant with access to meeting transcripts, summaries, and notes.

CONTEXT FROM MEETINGS:
{context}

USER QUESTION: {query}

Based ONLY on the context provided above, please answer the user's question. If the context doesn't contain enough information to fully answer the question, say so. Always cite which meeting the information comes from."""

    return prompt


async def generate_rag_response(
    query: str,
    user_id: str,
    filters: Optional[FilterContext] = None,
    top_k: int = MAX_SEARCH_RESULTS,
) -> str:
    """Generate RAG response for a query.
    
    Args:
        query: User's question.
        user_id: User making the query.
        filters: Optional filters for search.
        top_k: Number of search results to retrieve.
        
    Returns:
        Generated response from LLM.
        
    Raises:
        Exception: If search or generation fails.
    """
    logger.info(f"Generating RAG response for user {user_id}: {query}")
    
    # Step 1: Retrieve relevant context via hybrid search
    search_results = await hybrid_search(
        query=query,
        filters=filters,
        size=top_k,
        user_id=user_id,
    )
    
    logger.info(f"Retrieved {len(search_results)} search results")
    
    # Step 2: Build prompt with context
    prompt = build_rag_prompt(query, search_results)
    
    # Step 3: Generate response with Ollama
    try:
        async_client = ollama.AsyncClient(host=OLLAMA_HOST)
        
        response = await async_client.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful meeting assistant. Answer questions based on provided meeting context."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
        )
        
        answer = response["message"]["content"]
        logger.info(f"Generated response length: {len(answer)}")
        
        return answer
        
    except Exception as e:
        logger.error(f"Error generating RAG response: {e}", exc_info=True)
        raise


async def generate_rag_response_stream(
    query: str,
    user_id: str,
    filters: Optional[FilterContext] = None,
    top_k: int = MAX_SEARCH_RESULTS,
    include_sources: bool = False,
) -> AsyncGenerator[dict | str, None]:
    """Generate streaming RAG response for a query.
    
    This yields response chunks as they're generated by the LLM,
    allowing for real-time streaming to the frontend.
    
    Args:
        query: User's question.
        user_id: User making the query.
        filters: Optional filters for search.
        top_k: Number of search results to retrieve.
        include_sources: Whether to include source documents.
        
    Yields:
        Response chunks (strings) or metadata (dicts with sources).
        
    Raises:
        Exception: If search or generation fails.
    """
    logger.info(f"Generating streaming RAG response for user {user_id}: {query}")
    
    # Step 1: Retrieve relevant context via hybrid search
    search_results = await hybrid_search(
        query=query,
        filters=filters,
        size=top_k,
        user_id=user_id,
    )
    
    logger.info(f"Retrieved {len(search_results)} search results")
    
    # If requested, send sources first
    if include_sources and search_results:
        sources = [
            {
                "meeting_id": result.source.get("meeting_id"),
                "title": result.source.get("title"),
                "content_type": result.source.get("content_type"),
                "score": result.score,
            }
            for result in search_results
        ]
        yield {"sources": sources}
    
    # Step 2: Build prompt with context
    prompt = build_rag_prompt(query, search_results)
    
    # Step 3: Stream response from Ollama
    try:
        async_client = ollama.AsyncClient(host=OLLAMA_HOST)
        
        stream = await async_client.chat(
            model=OLLAMA_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful meeting assistant. Answer questions based on provided meeting context."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            stream=True,
        )
        
        # Stream chunks as they arrive
        async for chunk in stream:
            content = chunk["message"]["content"]
            if content:
                if include_sources:
                    yield {"content": content}
                else:
                    yield content
        
        logger.info("Streaming completed")
        
    except Exception as e:
        logger.error(f"Error streaming RAG response: {e}", exc_info=True)
        raise


async def format_sources_for_response(
    search_results: list[SearchResult],
) -> list[MessageSource]:
    """Format search results as MessageSource objects.
    
    Args:
        search_results: Retrieved documents from search.
        
    Returns:
        List of MessageSource objects for response.
    """
    sources = []
    
    for result in search_results:
        source_data = result.source
        
        source = MessageSource(
            meeting_id=source_data.get("meeting_id", ""),
            title=source_data.get("title", "Unknown"),
            content_type=source_data.get("content_type", "unknown"),
            relevance_score=result.score,
            excerpt=source_data.get("content", "")[:200] + "...",  # First 200 chars
        )
        sources.append(source)
    
    return sources
