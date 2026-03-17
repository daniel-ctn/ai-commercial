"""
Admin API routes — dashboard stats and management endpoints.

== Admin Dashboard (for Next.js devs) ==

In Next.js, you'd create an `/admin` route group with middleware:
    // app/admin/layout.tsx
    export default async function AdminLayout({ children }) {
      const session = await getServerSession()
      if (session.user.role !== 'admin') redirect('/403')
      return <AdminShell>{children}</AdminShell>
    }

In FastAPI, we protect the entire router with the `get_current_admin`
dependency. Every endpoint in this file requires admin role — the
dependency runs BEFORE the handler and raises 403 if not admin.

== Why separate admin endpoints? ==

The public product/shop/coupon endpoints only show active items and
don't expose user info. Admin endpoints show EVERYTHING (including
inactive items, owner details, user lists) so admins can manage the
platform.
"""

import uuid
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.product import Product
from app.models.shop import Shop
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.admin import (
    AdminStatsResponse,
    AdminUserResponse,
    AdminShopResponse,
    AdminProductResponse,
    AdminCouponResponse,
    UpdateUserRoleRequest,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Dashboard Stats ───────────────────────────────────────────────


@router.get("/stats", response_model=AdminStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Aggregate stats for the admin dashboard overview.

    Runs multiple COUNT queries in parallel-ish fashion.
    In a real app you'd cache these with Redis (Phase 8).
    """
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    total_shops = (await db.execute(select(func.count()).select_from(Shop))).scalar() or 0
    active_shops = (
        await db.execute(
            select(func.count()).select_from(Shop).where(Shop.is_active == True)
        )
    ).scalar() or 0
    total_products = (await db.execute(select(func.count()).select_from(Product))).scalar() or 0
    active_products = (
        await db.execute(
            select(func.count()).select_from(Product).where(Product.is_active == True)
        )
    ).scalar() or 0
    total_coupons = (await db.execute(select(func.count()).select_from(Coupon))).scalar() or 0
    active_coupons = (
        await db.execute(
            select(func.count()).select_from(Coupon).where(Coupon.is_active == True)
        )
    ).scalar() or 0
    total_categories = (
        await db.execute(select(func.count()).select_from(Category))
    ).scalar() or 0

    return AdminStatsResponse(
        total_users=total_users,
        total_shops=total_shops,
        active_shops=active_shops,
        total_products=total_products,
        active_products=active_products,
        total_coupons=total_coupons,
        active_coupons=active_coupons,
        total_categories=total_categories,
    )


# ── Users Management ─────────────────────────────────────────────


@router.get("/users", response_model=PaginatedResponse[AdminUserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """List all users with optional search and role filter."""
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        search_filter = User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(User.created_at.desc()).offset(offset).limit(page_size)
    )
    users = list(result.scalars().all())

    return PaginatedResponse(
        items=[AdminUserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    data: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Change a user's role (user, shop_admin, admin)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = data.role
    await db.flush()
    return AdminUserResponse.model_validate(user)


# ── Shops Management ─────────────────────────────────────────────


@router.get("/shops", response_model=PaginatedResponse[AdminShopResponse])
async def list_all_shops(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """List ALL shops (including inactive) with owner info."""
    query = select(Shop).options(joinedload(Shop.owner))
    count_query = select(func.count()).select_from(Shop)

    if search:
        search_filter = Shop.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if is_active is not None:
        query = query.where(Shop.is_active == is_active)
        count_query = count_query.where(Shop.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Shop.created_at.desc()).offset(offset).limit(page_size)
    )
    shops = list(result.scalars().unique().all())

    items = []
    for s in shops:
        item = AdminShopResponse.model_validate(s)
        item.owner_name = s.owner.name if s.owner else None
        item.owner_email = s.owner.email if s.owner else None
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.patch("/shops/{shop_id}/toggle-active", response_model=AdminShopResponse)
async def toggle_shop_active(
    shop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Toggle a shop's is_active status."""
    result = await db.execute(
        select(Shop).where(Shop.id == shop_id).options(joinedload(Shop.owner))
    )
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop.is_active = not shop.is_active
    await db.flush()

    resp = AdminShopResponse.model_validate(shop)
    resp.owner_name = shop.owner.name if shop.owner else None
    resp.owner_email = shop.owner.email if shop.owner else None
    return resp


# ── Products Management ──────────────────────────────────────────


@router.get("/products", response_model=PaginatedResponse[AdminProductResponse])
async def list_all_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    shop_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """List ALL products (including inactive) with shop/category info."""
    query = select(Product).options(
        joinedload(Product.shop), joinedload(Product.category)
    )
    count_query = select(func.count()).select_from(Product)

    if search:
        search_filter = Product.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if is_active is not None:
        query = query.where(Product.is_active == is_active)
        count_query = count_query.where(Product.is_active == is_active)

    if shop_id:
        query = query.where(Product.shop_id == shop_id)
        count_query = count_query.where(Product.shop_id == shop_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Product.created_at.desc()).offset(offset).limit(page_size)
    )
    products = list(result.scalars().unique().all())

    items = []
    for p in products:
        item = AdminProductResponse.model_validate(p)
        item.shop_name = p.shop.name if p.shop else None
        item.category_name = p.category.name if p.category else None
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.patch("/products/{product_id}/toggle-active", response_model=AdminProductResponse)
async def toggle_product_active(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Toggle a product's is_active status."""
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_active = not product.is_active
    await db.flush()

    resp = AdminProductResponse.model_validate(product)
    resp.shop_name = product.shop.name if product.shop else None
    resp.category_name = product.category.name if product.category else None
    return resp


# ── Coupons Management ───────────────────────────────────────────


@router.get("/coupons", response_model=PaginatedResponse[AdminCouponResponse])
async def list_all_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    shop_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """List ALL coupons with shop info."""
    query = select(Coupon).options(joinedload(Coupon.shop))
    count_query = select(func.count()).select_from(Coupon)

    if search:
        search_filter = Coupon.code.ilike(f"%{search}%") | Coupon.description.ilike(
            f"%{search}%"
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if is_active is not None:
        query = query.where(Coupon.is_active == is_active)
        count_query = count_query.where(Coupon.is_active == is_active)

    if shop_id:
        query = query.where(Coupon.shop_id == shop_id)
        count_query = count_query.where(Coupon.shop_id == shop_id)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Coupon.valid_until.desc()).offset(offset).limit(page_size)
    )
    coupons = list(result.scalars().unique().all())

    items = []
    for c in coupons:
        item = AdminCouponResponse.model_validate(c)
        item.shop_name = c.shop.name if c.shop else None
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.patch("/coupons/{coupon_id}/toggle-active", response_model=AdminCouponResponse)
async def toggle_coupon_active(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Toggle a coupon's is_active status."""
    result = await db.execute(
        select(Coupon)
        .where(Coupon.id == coupon_id)
        .options(joinedload(Coupon.shop))
    )
    coupon = result.scalar_one_or_none()
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")

    coupon.is_active = not coupon.is_active
    await db.flush()

    resp = AdminCouponResponse.model_validate(coupon)
    resp.shop_name = coupon.shop.name if coupon.shop else None
    return resp
