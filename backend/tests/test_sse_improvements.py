"""Tests for SSE metadata parsing and DB session handling improvements"""
import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

from security import get_password_hash

os.environ.setdefault("LLM_BASE_URL", "http://localhost:1234/v1")
os.environ.setdefault("LLM_API_KEY", "test-key")

from database import Base, get_db
from main import app
import models

# Setup test DB (in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def override_dependencies():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def clear_db():
    """Clear database before each test"""
    db = TestingSessionLocal()
    db.query(models.Message).delete()
    db.query(models.Conversation).delete()
    db.query(models.User).delete()
    db.commit()
    db.close()
    yield

@pytest.fixture
def test_user(clear_db):
    db = TestingSessionLocal()
    user = models.User(
        email="tester@example.com",
        hashed_password=get_password_hash("password123"),
        default_top_p=0.9,
        default_temperature=0.7
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_data = {"email": user.email, "password": "password123", "id": user.id}
    db.close()
    return user_data

@pytest.fixture
async def auth_headers(test_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user["email"], "password": test_user["password"]},
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_sse_metadata_parsing_with_conversation_id(test_user, auth_headers):
    """Test that metadata events are correctly parsed and conversation_id is added"""
    with patch("api.chat.stream_llm_response") as mock_stream:
        async def mock_generator(*args, **kwargs):
            # Simulate various SSE events
            yield 'data: {"content": "Test"}\n\n'
            yield 'data: {"type": "metadata", "duration_ms": 150}\n\n'
        
        mock_stream.side_effect = mock_generator
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/chat",
                headers=auth_headers,
                json={"message": "Test metadata parsing", "history": []}
            )
            assert response.status_code == 200
            
            # Read and parse stream
            content = b""
            async for chunk in response.aiter_bytes():
                content += chunk
            
            # Verify conversation_id was added to metadata
            content_str = content.decode()
            assert "conversation_id" in content_str
            assert '"type": "metadata"' in content_str or '"type":"metadata"' in content_str

@pytest.mark.asyncio
async def test_sse_malformed_json_handling(test_user, auth_headers):
    """Test that malformed JSON in SSE stream is handled gracefully"""
    with patch("api.chat.stream_llm_response") as mock_stream:
        async def mock_generator(*args, **kwargs):
            yield 'data: {"content": "Valid"}\n\n'
            yield 'data: {invalid json}\n\n'  # Malformed
            yield 'data: {"content": "Also valid"}\n\n'
        
        mock_stream.side_effect = mock_generator
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/chat",
                headers=auth_headers,
                json={"message": "Test error handling", "history": []}
            )
            # Should not crash, should complete successfully
            assert response.status_code == 200
            
            content = b""
            async for chunk in response.aiter_bytes():
                content += chunk
            
            # Should contain both valid messages
            content_str = content.decode()
            assert "Valid" in content_str
            assert "Also valid" in content_str

@pytest.mark.asyncio
async def test_sse_content_with_metadata_word(test_user, auth_headers):
    """Test that content containing the word 'metadata' is not mistakenly parsed"""
    with patch("api.chat.stream_llm_response") as mock_stream:
        async def mock_generator(*args, **kwargs):
            # Content that contains "metadata" word should NOT be modified
            yield 'data: {"content": "This is about metadata systems"}\n\n'
            yield 'data: {"content": " and data storage"}\n\n'
            yield 'data: {"type": "metadata", "duration_ms": 200}\n\n'
        
        mock_stream.side_effect = mock_generator
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/chat",
                headers=auth_headers,
                json={"message": "Tell me about metadata", "history": []}
            )
            assert response.status_code == 200
            
            content = b""
            async for chunk in response.aiter_bytes():
                content += chunk
            
            content_str = content.decode()
            # The content message should not have conversation_id added
            lines = content_str.split('\n')
            content_lines = [l for l in lines if '"content"' in l and '"type"' not in l]
            # These lines should NOT contain conversation_id
            for line in content_lines:
                if 'data:' in line:
                    assert 'conversation_id' not in line

@pytest.mark.asyncio
async def test_save_assistant_message_db_session(test_user, auth_headers):
    """Test that save_assistant_message uses separate DB session correctly"""
    with patch("api.chat.stream_llm_response") as mock_stream:
        callback_called = False
        
        async def mock_generator(msg, history, callback, **kwargs):
            nonlocal callback_called
            yield 'data: {"content": "Response text"}\n\n'
            # Call the callback to save the message
            await callback("Response text", 100)
            callback_called = True
            yield 'data: {"type": "metadata", "duration_ms": 100}\n\n'
        
        mock_stream.side_effect = mock_generator
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/chat",
                headers=auth_headers,
                json={"message": "Test callback", "history": []}
            )
            assert response.status_code == 200
            
            # Stream should complete without errors
            content = b""
            async for chunk in response.aiter_bytes():
                content += chunk
            
            # Verify callback was called
            assert callback_called
            
            # Verify message was saved in DB
            db = TestingSessionLocal()
            messages = db.query(models.Message).filter(models.Message.role == "assistant").all()
            assert len(messages) > 0
            assert messages[0].content == "Response text"
            assert messages[0].response_time == 100
            db.close()

@pytest.mark.asyncio
async def test_sse_non_data_lines_passthrough(test_user, auth_headers):
    """Test that non-data lines in SSE stream are passed through unchanged"""
    with patch("api.chat.stream_llm_response") as mock_stream:
        async def mock_generator(*args, **kwargs):
            yield ': comment line\n'
            yield 'data: {"content": "Test"}\n\n'
            yield 'event: ping\n'
            yield 'data: ping\n\n'
        
        mock_stream.side_effect = mock_generator
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/chat",
                headers=auth_headers,
                json={"message": "Test non-data lines", "history": []}
            )
            assert response.status_code == 200
            
            content = b""
            async for chunk in response.aiter_bytes():
                content += chunk
            
            content_str = content.decode()
            # Comment and event lines should be present
            assert ': comment line' in content_str or 'comment line' in content_str
            assert 'Test' in content_str
