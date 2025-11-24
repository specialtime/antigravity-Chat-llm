from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, sessionmaker
from typing import List, Optional
from services.llm import stream_llm_response
from database import get_db, SessionLocal
import models
from security import get_current_user
import json

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = Field(default_factory=list)
    conversation_id: Optional[int] = None
    top_p: Optional[float] = None
    temperature: Optional[float] = None

class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: str
    top_p: float
    temperature: float

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    role: str
    content: str
    response_time: Optional[int] = None

    class Config:
        from_attributes = True

def _clamp_top_p(value: Optional[float], fallback: float = 0.9) -> float:
    if value is None:
        return fallback
    return max(0.0, min(1.0, value))


def _clamp_temperature(value: Optional[float], fallback: float = 0.7) -> float:
    if value is None:
        return fallback
    return max(0.0, min(2.0, value))


@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # 1. Get or Create Conversation
    if request.conversation_id:
        conversation = (
            db.query(models.Conversation)
            .filter(
                models.Conversation.id == request.conversation_id,
                models.Conversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Update settings if provided
        if request.top_p is not None:
            conversation.top_p = _clamp_top_p(request.top_p, conversation.top_p)
        if request.temperature is not None:
            conversation.temperature = _clamp_temperature(request.temperature, conversation.temperature)
        db.commit()
    else:
        # Create title from first few words of message
        title = " ".join(request.message.split()[:5]).strip() or "New Chat"
        top_p = _clamp_top_p(request.top_p, current_user.default_top_p)
        temperature = _clamp_temperature(request.temperature, current_user.default_temperature)
        
        conversation = models.Conversation(
            title=title,
            top_p=top_p,
            temperature=temperature,
            user_id=current_user.id,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Save User Message
    user_msg = models.Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_msg)
    db.commit()

    # 3. Define callback to save Assistant Message using the same DB bind as the request
    bind = db.get_bind()
    session_factory = (
        sessionmaker(autocommit=False, autoflush=False, bind=bind)
        if bind is not None
        else SessionLocal
    )

    async def save_assistant_message(content, duration_ms):
        db_session = session_factory()
        try:
            assistant_msg = models.Message(
                conversation_id=conversation.id,
                role="assistant",
                content=content,
                response_time=duration_ms
            )
            db_session.add(assistant_msg)
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            print(f"Error saving assistant message: {e}")
        finally:
            db_session.close()

    # 4. Stream Response
    # We need to wrap the generator to inject conversation_id into the metadata
    async def stream_wrapper():
        # Pass conversation settings to the LLM service
        async for chunk in stream_llm_response(
            request.message, 
            request.history, 
            save_assistant_message,
            top_p=conversation.top_p,
            temperature=conversation.temperature
        ):
            # Intercept metadata to add conversation_id
            # Parse JSON payload instead of string manipulation
            if chunk.startswith("data: "):
                try:
                    data_str = chunk[6:].strip()
                    data = json.loads(data_str)
                    
                    # Add conversation_id to metadata events
                    if data.get("type") == "metadata":
                        data["conversation_id"] = conversation.id
                        yield f"data: {json.dumps(data)}\n\n"
                    else:
                        yield chunk
                except json.JSONDecodeError:
                    # Pass through malformed chunks
                    yield chunk
            else:
                yield chunk

    return StreamingResponse(
        stream_wrapper(),
        media_type="text/event-stream"
    )

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversations = (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == current_user.id)
        .order_by(models.Conversation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Convert datetime to string for Pydantic if needed, or use orm_mode handles it?
    # Pydantic v1/v2 differences. Let's assume standard behavior.
    # We might need to map created_at to str if Pydantic doesn't auto-convert.
    return [
        ConversationResponse(
            id=c.id, 
            title=c.title, 
            created_at=c.created_at.isoformat(),
            top_p=c.top_p,
            temperature=c.temperature
        ) for c in conversations
    ]

@router.get("/conversations/{conversation_id}", response_model=List[MessageResponse])
def get_conversation_history(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = (
        db.query(models.Conversation)
        .filter(
            models.Conversation.id == conversation_id,
            models.Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return [
        MessageResponse(role=m.role, content=m.content, response_time=m.response_time) 
        for m in conversation.messages
    ]
