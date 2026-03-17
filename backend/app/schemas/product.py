"""Product Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ProductCreate(BaseModel):
    shop_id: uuid.UUID
    category_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    price: float = Field(ge=0)
    original_price: float | None = Field(default=None, ge=0)
    image_url: HttpUrl | None = None
    attributes: dict[str, Any] | None = None


class ProductUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    price: float | None = Field(default=None, ge=0)
    original_price: float | None = Field(default=None, ge=0)
    image_url: HttpUrl | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: uuid.UUID
    shop_id: uuid.UUID
    category_id: uuid.UUID
    name: str
    description: str | None = None
    price: float
    original_price: float | None = None
    image_url: str | None = None
    attributes: dict[str, Any] | None = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDetailResponse(ProductResponse):
    """Extended response with shop and category names (avoids extra API calls)."""
    shop_name: str | None = None
    category_name: str | None = None
