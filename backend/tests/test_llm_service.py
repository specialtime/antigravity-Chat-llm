import json
import os

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("LLM_BASE_URL", "http://localhost:1234/v1")
os.environ.setdefault("LLM_API_KEY", "test-key")

from services.llm import stream_llm_response

@pytest.mark.asyncio
async def test_stream_llm_response_success():
    # Mock the OpenAI client
    with patch("services.llm.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        # Create a mock stream
        mock_chunk1 = MagicMock()
        mock_chunk1.choices = [MagicMock(delta=MagicMock(content="Hello"))]
        
        mock_chunk2 = MagicMock()
        mock_chunk2.choices = [MagicMock(delta=MagicMock(content=" World"))]
        
        # Async iterator for the stream
        async def async_gen():
            yield mock_chunk1
            yield mock_chunk2
            
        mock_create.return_value = async_gen()
        
        # Mock callback
        mock_callback = AsyncMock()
        
        # Collect results
        results = []
        async for chunk in stream_llm_response("Hi", [], mock_callback):
            results.append(chunk)
            
        assert len(results) >= 2
        # Check that content chunks are present
        content_chunks = [r for r in results if '"content"' in r]
        assert len(content_chunks) >= 2

@pytest.mark.asyncio
async def test_stream_llm_response_error():
    with patch("services.llm.client.chat.completions.create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = Exception("API Error")
        
        mock_callback = AsyncMock()
        
        results = []
        async for chunk in stream_llm_response("Hi", [], mock_callback):
            results.append(chunk)
            
        assert len(results) >= 1
        # Check for error in response
        error_chunks = [r for r in results if '"error"' in r]
        assert len(error_chunks) >= 1

