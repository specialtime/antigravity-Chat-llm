from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from typing import Optional

import models
from database import get_db
from security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    get_user_by_email,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    default_top_p: Optional[float] = None
    default_temperature: Optional[float] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    default_top_p: float
    default_temperature: float
    created_at: str

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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower()
    existing_user = get_user_by_email(db, normalized_email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = models.User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        default_top_p=_clamp_top_p(payload.default_top_p),
        default_temperature=_clamp_temperature(payload.default_temperature),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        email=user.email,
        default_top_p=user.default_top_p,
        default_temperature=user.default_temperature,
        created_at=user.created_at.isoformat(),
    )


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    normalized_email = form_data.username.lower()
    user = get_user_by_email(db, normalized_email)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token = create_access_token({"sub": user.email})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        default_top_p=current_user.default_top_p,
        default_temperature=current_user.default_temperature,
        created_at=current_user.created_at.isoformat(),
    )
