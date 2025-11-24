import os
import uuid

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
    db = TestingSessionLocal()
    db.query(models.Message).delete()
    db.query(models.Conversation).delete()
    db.query(models.User).delete()
    db.commit()
    db.close()
    yield


@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def test_user(clear_db):
    db = TestingSessionLocal()
    user = models.User(
        email="tester@example.com",
        hashed_password=get_password_hash("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    payload = {"email": user.email, "password": "password123", "id": user.id}
    db.close()
    return payload


@pytest.fixture
async def auth_headers(async_client, test_user):
    response = await async_client.post(
        "/api/auth/login",
        data={"username": test_user["email"], "password": test_user["password"]},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_register_and_login_flow(clear_db, async_client):
    email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": email,
        "password": "secretpass",
        "default_top_p": 0.8,
        "default_temperature": 0.6,
    }

    register_response = await async_client.post("/api/auth/register", json=payload)
    assert register_response.status_code == 201

    login_response = await async_client.post(
        "/api/auth/login",
        data={"username": email, "password": payload["password"]},
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


@pytest.mark.asyncio
async def test_get_conversations_requires_auth(async_client, clear_db):
    response = await async_client.get("/api/conversations")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_conversations_empty(async_client, test_user, auth_headers):
    response = await async_client.get("/api/conversations", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_conversation_via_chat(async_client, test_user, auth_headers):
    with patch("api.chat.stream_llm_response") as mock_stream:
        async def mock_generator(*args, **kwargs):
            yield 'data: {"content": "Hello"}\n\n'
            yield 'data: {"content": " World"}\n\n'
            yield 'data: {"type": "metadata", "duration_ms": 100}\n\n'

        mock_stream.side_effect = mock_generator

        response = await async_client.post(
            "/api/chat",
            headers=auth_headers,
            json={"message": "Hello", "history": [], "top_p": 0.5, "temperature": 0.1},
        )
        assert response.status_code == 200

        db = TestingSessionLocal()
        conversations = db.query(models.Conversation).all()
        assert len(conversations) == 1
        assert conversations[0].title == "Hello"
        assert conversations[0].top_p == 0.5
        assert conversations[0].temperature == 0.1
        assert conversations[0].user_id == test_user["id"]

        messages = db.query(models.Message).all()
        assert len(messages) >= 1
        db.close()


@pytest.mark.asyncio
async def test_update_settings(async_client, test_user, auth_headers):
    db = TestingSessionLocal()
    conv = models.Conversation(
        title="Test",
        top_p=0.9,
        temperature=0.7,
        user_id=test_user["id"],
    )
    db.add(conv)
    db.commit()
    conv_id = conv.id
    db.close()

    with patch("api.chat.stream_llm_response") as mock_stream:
        async def mock_generator(*args, **kwargs):
            yield 'data: {"type": "metadata", "duration_ms": 100}\n\n'

        mock_stream.side_effect = mock_generator

        response = await async_client.post(
            "/api/chat",
            headers=auth_headers,
            json={
                "message": "Update settings",
                "history": [],
                "conversation_id": conv_id,
                "top_p": 0.2,
                "temperature": 1.5,
            },
        )
        assert response.status_code == 200

        db = TestingSessionLocal()
        updated_conv = (
            db.query(models.Conversation)
            .filter(models.Conversation.id == conv_id)
            .first()
        )
        assert updated_conv.top_p == 0.2
        assert updated_conv.temperature == 1.5
        assert updated_conv.user_id == test_user["id"]
        db.close()
