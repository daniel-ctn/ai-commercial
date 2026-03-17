"""
Admin-specific Pydantic schemas.

These extend the regular response schemas with extra fields that only
admins should see (like owner_email, user counts, etc.).

== Why separate admin schemas? ==

The public ProductResponse hides inactive items. AdminProductResponse
includes ALL items plus metadata (owner info, active status). This is
the same pattern as having separate public/admin API responses in
Next.js — you wouldn't send user emails to the public listing page.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminStatsResponse(BaseModel):
    """Dashboard overview stats — all the numbers at a glance."""
    total_users: int
    total_shops: int
    active_shops: int
    total_products: int
    active_products: int
    total_coupons: int
    active_coupons: int
    total_categories: int


class AdminUserResponse(BaseModel):
    """User info visible to admins — includes role but never password."""
    id: uuid.UUID
    email: str
    name: str
    role: str
    oauth_provider: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateUserRoleRequest(BaseModel):
    """Request body for changing a user's role."""
    role: str


class AdminShopResponse(BaseModel):
    """Shop with owner info — admins see who owns each shop."""
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    description: str | None = None
    logo_url: str | None = None
    website: str | None = None
    is_active: bool
    created_at: datetime
    owner_name: str | None = None
    owner_email: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminProductResponse(BaseModel):
    """Product with shop/category names — admins see inactive items too."""
    id: uuid.UUID
    shop_id: uuid.UUID
    category_id: uuid.UUID
    name: str
    description: str | None = None
    price: float
    original_price: float | None = None
    image_url: str | None = None
    is_active: bool
    created_at: datetime
    shop_name: str | None = None
    category_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminCouponResponse(BaseModel):
    """Coupon with shop name — admins can see all coupons."""
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
    shop_name: str | None = None

    model_config = ConfigDict(from_attributes=True)
