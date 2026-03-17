"""Coupon Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CouponCreate(BaseModel):
    shop_id: uuid.UUID
    code: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    discount_type: Literal["percentage", "fixed"]
    discount_value: float = Field(gt=0)
    min_purchase: float | None = Field(default=None, ge=0)
    valid_from: datetime
    valid_until: datetime

    @model_validator(mode="after")
    def validate_dates_and_value(self):
        if self.valid_until <= self.valid_from:
            raise ValueError("valid_until must be after valid_from")
        if self.discount_type == "percentage" and self.discount_value > 100:
            raise ValueError("Percentage discount cannot exceed 100")
        return self


class CouponUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    discount_type: Literal["percentage", "fixed"] | None = None
    discount_value: float | None = Field(default=None, gt=0)
    min_purchase: float | None = Field(default=None, ge=0)
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
