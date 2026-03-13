"""Schemas package — re-exports all Pydantic schemas."""

from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate
from app.schemas.shop import ShopCreate, ShopUpdate, ShopResponse
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponResponse
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatSessionResponse

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "ShopCreate",
    "ShopUpdate",
    "ShopResponse",
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",
    "CouponCreate",
    "CouponUpdate",
    "CouponResponse",
    "ChatMessageCreate",
    "ChatMessageResponse",
    "ChatSessionResponse",
]
