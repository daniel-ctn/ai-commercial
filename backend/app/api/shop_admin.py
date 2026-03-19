"""
Shop Admin API — scoped endpoints for shop_admin users.

Allows shop owners to manage their own shop's products and coupons
without requiring full admin access.
"""

import uuid
from math import ceil

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_shop_admin
from app.models.coupon import Coupon
from app.models.product import Product
from app.models.shop import Shop
from app.models.user import User
from app.schemas.admin import (
    AdminProductResponse,
    AdminCouponResponse,
    ShopStatsResponse,
    BulkActionResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/shop-admin", tags=["Shop Admin"])


async def _get_owned_shop(user: User, db: AsyncSession) -> Shop:
    result = await db.execute(select(Shop).where(Shop.owner_id == user.id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=403, detail="You do not own a shop")
    return shop


@router.get("/stats", response_model=ShopStatsResponse)
async def get_my_shop_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_shop_admin),
):
    shop = await _get_owned_shop(current_user, db)

    total_products = (await db.execute(
        select(func.count()).select_from(Product).where(Product.shop_id == shop.id)
    )).scalar() or 0
    active_products = (await db.execute(
        select(func.count()).select_from(Product)
        .where(Product.shop_id == shop.id, Product.is_active == True)
    )).scalar() or 0
    total_coupons = (await db.execute(
        select(func.count()).select_from(Coupon).where(Coupon.shop_id == shop.id)
    )).scalar() or 0
    active_coupons = (await db.execute(
        select(func.count()).select_from(Coupon)
        .where(Coupon.shop_id == shop.id, Coupon.is_active == True)
    )).scalar() or 0
    missing_img = (await db.execute(
        select(func.count()).select_from(Product)
        .where(Product.shop_id == shop.id)
        .where((Product.image_url == None) | (Product.image_url == ""))
    )).scalar() or 0
    missing_desc = (await db.execute(
        select(func.count()).select_from(Product)
        .where(Product.shop_id == shop.id)
        .where((Product.description == None) | (Product.description == ""))
    )).scalar() or 0

    quality_score = 100
    if total_products > 0:
        quality_score = round(
            ((total_products - missing_img) / total_products) * 50
            + ((total_products - missing_desc) / total_products) * 50
        )

    return ShopStatsResponse(
        shop_id=shop.id,
        shop_name=shop.name,
        total_products=total_products,
        active_products=active_products,
        total_coupons=total_coupons,
        active_coupons=active_coupons,
        data_quality={
            "missing_images": missing_img,
            "missing_descriptions": missing_desc,
            "quality_score": quality_score,
        },
    )


@router.get("/products", response_model=PaginatedResponse[AdminProductResponse])
async def list_my_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_shop_admin),
):
    shop = await _get_owned_shop(current_user, db)

    query = select(Product).where(Product.shop_id == shop.id).options(
        joinedload(Product.shop), joinedload(Product.category)
    )
    count_query = select(func.count()).select_from(Product).where(Product.shop_id == shop.id)

    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
        count_query = count_query.where(Product.name.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
        count_query = count_query.where(Product.is_active == is_active)

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
        items=items, total=total, page=page, page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.patch("/products/{product_id}/toggle-active", response_model=AdminProductResponse)
async def toggle_my_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_shop_admin),
):
    shop = await _get_owned_shop(current_user, db)
    result = await db.execute(
        select(Product).where(Product.id == product_id)
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.shop_id != shop.id:
        raise HTTPException(status_code=403, detail="Product does not belong to your shop")

    product.is_active = not product.is_active
    await db.flush()

    resp = AdminProductResponse.model_validate(product)
    resp.shop_name = product.shop.name if product.shop else None
    resp.category_name = product.category.name if product.category else None
    return resp


@router.get("/coupons", response_model=PaginatedResponse[AdminCouponResponse])
async def list_my_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_shop_admin),
):
    shop = await _get_owned_shop(current_user, db)

    query = select(Coupon).where(Coupon.shop_id == shop.id).options(joinedload(Coupon.shop))
    count_query = select(func.count()).select_from(Coupon).where(Coupon.shop_id == shop.id)

    if search:
        query = query.where(Coupon.code.ilike(f"%{search}%") | Coupon.description.ilike(f"%{search}%"))
        count_query = count_query.where(Coupon.code.ilike(f"%{search}%") | Coupon.description.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.where(Coupon.is_active == is_active)
        count_query = count_query.where(Coupon.is_active == is_active)

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
        items=items, total=total, page=page, page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/products/bulk-toggle", response_model=BulkActionResponse)
async def bulk_toggle_my_products(
    ids: list[uuid.UUID] = Body(..., embed=False),
    activate: bool = Body(..., embed=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_shop_admin),
):
    shop = await _get_owned_shop(current_user, db)
    result = await db.execute(
        update(Product)
        .where(Product.id.in_(ids), Product.shop_id == shop.id)
        .values(is_active=activate)
    )
    return BulkActionResponse(affected=result.rowcount)
