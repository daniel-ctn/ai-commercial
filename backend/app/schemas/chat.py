"""Chat Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatMessageCreate(BaseModel):
    """What the frontend sends when the user types a message."""
    content: str


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    messages: list[ChatMessageResponse] = []

    model_config = ConfigDict(from_attributes=True)
