"""Shop Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ShopCreate(BaseModel):
    name: str
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None


class ShopUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None
    is_active: bool | None = None


class ShopResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
