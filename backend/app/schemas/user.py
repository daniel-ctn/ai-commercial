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

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class UserCreate(BaseModel):
    """Schema for POST /register — what the frontend sends."""
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    """Schema for POST /login."""
    email: EmailStr
    password: str


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
