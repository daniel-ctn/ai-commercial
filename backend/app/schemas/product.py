"""Product Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ProductCreate(BaseModel):
    shop_id: uuid.UUID
    category_id: uuid.UUID
    name: str
    description: str | None = None
    price: float
    original_price: float | None = None
    image_url: str | None = None
    attributes: dict[str, Any] | None = None


class ProductUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    name: str | None = None
    description: str | None = None
    price: float | None = None
    original_price: float | None = None
    image_url: str | None = None
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
