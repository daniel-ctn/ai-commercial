"""
User Pydantic schemas — request/response validation.

== Pydantic Schemas vs SQLAlchemy Models ==

This is a concept that doesn't exist in Next.js (unless you use Zod).

In FastAPI, you separate:
  1. **SQLAlchemy models** → define the DATABASE structure (what's stored)
  2. **Pydantic schemas** → define the API shape (what's sent/received)

Why separate them?
  - You never want to send `password_hash` to the frontend
  - You want different shapes for "create user" vs "read user" vs "update user"
  - Pydantic automatically validates incoming JSON and returns clear errors

It's like having different TypeScript interfaces for the same entity:
    interface CreateUserDto { email: string; password: string; name: string }
    interface UserResponse   { id: string; email: string; name: string; role: string }
    interface UpdateUserDto  { name?: string; email?: string }

The `model_config = ConfigDict(from_attributes=True)` line tells Pydantic
it can read data directly from SQLAlchemy model instances (which use
attributes, not dict keys).
"""

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


class UserCreate(BaseModel):
    """Schema for POST /register — what the frontend sends."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    """Schema for POST /login."""
    email: EmailStr
    password: str = Field(max_length=128)


class UserResponse(BaseModel):
    """Schema for returning user data — notice: NO password_hash."""
    id: uuid.UUID
    email: str
    name: str
    role: str
    oauth_provider: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Schema for PATCH /users/me — all fields optional."""
    name: str | None = None
    email: EmailStr | None = None
