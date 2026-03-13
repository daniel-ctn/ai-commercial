"""Coupon Pydantic schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CouponCreate(BaseModel):
    shop_id: uuid.UUID
    code: str
    description: str | None = None
    discount_type: str  # "percentage" or "fixed"
    discount_value: float
    min_purchase: float | None = None
    valid_from: datetime
    valid_until: datetime


class CouponUpdate(BaseModel):
    code: str | None = None
    description: str | None = None
    discount_type: str | None = None
    discount_value: float | None = None
    min_purchase: float | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    is_active: bool | None = None


class CouponResponse(BaseModel):
    id: uuid.UUID
    shop_id: uuid.UUID
    code: str
    description: str | None = None
    discount_type: str
    discount_value: float
    min_purchase: float | None = None
    valid_from: datetime
    valid_until: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
