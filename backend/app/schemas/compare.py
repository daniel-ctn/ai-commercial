"""Product comparison schemas."""

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CompareProductItem(BaseModel):
    """A single product in a comparison result, with normalized attributes."""
    id: uuid.UUID
    name: str
    description: str | None = None
    price: float
    original_price: float | None = None
    image_url: str | None = None
    attributes: dict[str, Any] | None = None
    shop_name: str | None = None
    category_name: str | None = None
    on_sale: bool = False

    model_config = ConfigDict(from_attributes=True)


class CompareResponse(BaseModel):
    """Comparison result with products and a union of all attribute keys."""
    products: list[CompareProductItem]
    attribute_keys: list[str] = Field(
        default_factory=list,
        description="Union of all attribute keys across compared products, sorted alphabetically",
    )
