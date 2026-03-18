"""
Coupon/deals API routes.

Public users can browse active coupons. Shop owners manage their own.
"""

import uuid
import json
import logging
from datetime import datetime, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.redis import redis_client
from app.core.dependencies import get_current_user
from app.models.coupon import Coupon
from app.models.shop import Shop
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.coupon import CouponCreate, CouponResponse, CouponUpdate

router = APIRouter(prefix="/coupons", tags=["Coupons"])

logger = logging.getLogger(__name__)


async def _cache_get(key: str) -> str | None:
    try:
        return await redis_client.get(key)
    except Exception:
        logger.warning("Redis read failed for key %s", key, exc_info=True)
        return None


async def _cache_set(key: str, value: str, ttl: int = 60) -> None:
    try:
        await redis_client.setex(key, ttl, value)
    except Exception:
        logger.warning("Redis write failed for key %s", key, exc_info=True)


async def _cache_delete(key: str) -> None:
    try:
        await redis_client.delete(key)
    except Exception:
        logger.warning("Redis delete failed for key %s", key, exc_info=True)


@router.get("", response_model=PaginatedResponse[CouponResponse])
async def list_coupons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    shop_id: uuid.UUID | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """
    List coupons. By default only shows currently active and valid ones.
    Pass ?active_only=false to see all (for shop owner dashboards).
    """
    cache_key = f"coupons:list:{page}:{page_size}:{shop_id}:{active_only}"
    cached_data = await _cache_get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    now = datetime.now(timezone.utc)

    query = select(Coupon)
    count_query = select(func.count()).select_from(Coupon)

    if active_only:
        active_filter = and_(
            Coupon.is_active == True,
            Coupon.valid_from <= now,
            Coupon.valid_until >= now,
        )
        query = query.where(active_filter)
        count_query = count_query.where(active_filter)

    if shop_id:
        query = query.where(Coupon.shop_id == shop_id)
        count_query = count_query.where(Coupon.shop_id == shop_id)

    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Coupon.valid_until.asc()).offset(offset).limit(page_size)
    )
    coupons = list(result.scalars().all())

    response = PaginatedResponse(
        items=coupons,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )
    
    # Cache for 60 seconds
    await _cache_set(cache_key, response.model_dump_json())
    
    return response


@router.get("/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"coupon:detail:{coupon_id}"
    cached_data = await _cache_get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")

    resp = CouponResponse.model_validate(coupon)
    
    # Cache for 60 seconds
    await _cache_set(cache_key, resp.model_dump_json())
    
    return resp


@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a coupon. Must own the shop."""
    result = await db.execute(select(Shop).where(Shop.id == data.shop_id))
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your shop")

    coupon = Coupon(**data.model_dump())
    db.add(coupon)
    await db.flush()
    await _cache_delete(f"coupon:detail:{coupon.id}")
    return coupon


@router.patch("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a coupon. Must own the shop it belongs to."""
    result = await db.execute(
        select(Coupon).where(Coupon.id == coupon_id).options(joinedload(Coupon.shop))
    )
    coupon = result.scalar_one_or_none()
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if coupon.shop.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your shop")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(coupon, field, value)

    await db.flush()
    await _cache_delete(f"coupon:detail:{coupon_id}")
    return coupon


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a coupon. Must own the shop it belongs to."""
    result = await db.execute(
        select(Coupon).where(Coupon.id == coupon_id).options(joinedload(Coupon.shop))
    )
    coupon = result.scalar_one_or_none()
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if coupon.shop.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your shop")

    await db.delete(coupon)
    await db.flush()
    await _cache_delete(f"coupon:detail:{coupon_id}")
