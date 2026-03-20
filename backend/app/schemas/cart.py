import uuid
from pydantic import BaseModel, Field


class AddToCartRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(ge=1)


class CartItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_image: str | None
    shop_name: str
    shop_id: uuid.UUID | None
    quantity: int
    unit_price: float
    line_total: float


class CartResponse(BaseModel):
    id: uuid.UUID
    items: list[CartItemResponse]
    subtotal: float
    discount: float
    total: float
    item_count: int
