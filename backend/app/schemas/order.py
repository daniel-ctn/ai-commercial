import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    coupon_code: str | None = None
    shipping_name: str | None = None
    shipping_address: str | None = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    order_id: uuid.UUID


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID | None
    shop_id: uuid.UUID | None
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


class OrderResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    subtotal: float
    discount: float
    total: float
    shipping_name: str | None
    shipping_address: str | None
    stripe_session_id: str | None = None
    items: list[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime


class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(pattern=r"^(pending|paid|shipped|delivered|cancelled|refunded)$")
