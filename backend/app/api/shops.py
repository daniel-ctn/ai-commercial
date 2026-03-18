"""
Shop API routes.

== Ownership Authorization (for Next.js devs) ==

Some routes need more than "is the user logged in?":
  - Anyone can VIEW a shop
  - Only the OWNER can EDIT or DELETE their shop

In Next.js, you'd check `session.user.id === shop.ownerId` in each handler.
Here, we do the same with a helper function `_verify_shop_owner()`.

== Query Parameters for Filtering ==

FastAPI auto-validates query parameters:
    @router.get("/")
    async def list_shops(page: int = 1, page_size: int = 20):

This accepts: GET /shops?page=2&page_size=10
If someone sends ?page=abc, FastAPI returns a 422 validation error.
Same as Zod validation on Next.js query params.
"""

import uuid
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.shop import Shop
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.shop import ShopCreate, ShopResponse, ShopUpdate

router = APIRouter(prefix="/shops", tags=["Shops"])


async def _verify_shop_owner(
    shop_id: uuid.UUID, user: User, db: AsyncSession
) -> Shop:
    """Load a shop and verify the current user owns it. Raises 403/404."""
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()

    if shop is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not own this shop")

    return shop


@router.get("", response_model=PaginatedResponse[ShopResponse])
async def list_shops(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all active shops with optional search and pagination.

    == How pagination works ==

    Instead of loading ALL shops (could be thousands), we load one "page":
      - Page 1: items 1–20
      - Page 2: items 21–40
      - etc.

    SQL uses OFFSET + LIMIT:
      SELECT * FROM shops LIMIT 20 OFFSET 20;  ← page 2

    We also run a COUNT query to know the total, so the frontend can
    show "Page 2 of 5" and render pagination buttons.
    """
    query = select(Shop).where(Shop.is_active == True)
    count_query = select(func.count()).select_from(Shop).where(Shop.is_active == True)

    if search:
        query = query.where(Shop.name.ilike(f"%{search}%"))
        count_query = count_query.where(Shop.name.ilike(f"%{search}%"))

    # Get total count
    total = (await db.execute(count_query)).scalar() or 0

    # Get paginated results
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Shop.created_at.desc()).offset(offset).limit(page_size)
    )
    shops = list(result.scalars().all())

    return PaginatedResponse(
        items=shops,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{shop_id}", response_model=ShopResponse)
async def get_shop(
    shop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


@router.post("", response_model=ShopResponse, status_code=status.HTTP_201_CREATED)
async def create_shop(
    data: ShopCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new shop. The current user becomes the owner.

    Also upgrades the user's role to 'shop_admin' if they're a regular user,
    since they now own a shop.
    """
    shop = Shop(**data.model_dump(), owner_id=current_user.id)
    db.add(shop)

    # Upgrade role if needed
    if current_user.role == "user":
        current_user.role = "shop_admin"

    await db.flush()
    return shop


@router.patch("/{shop_id}", response_model=ShopResponse)
async def update_shop(
    shop_id: uuid.UUID,
    data: ShopUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a shop (owner only)."""
    shop = await _verify_shop_owner(shop_id, current_user, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shop, field, value)

    await db.flush()
    return shop


@router.delete("/{shop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shop(
    shop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a shop (owner only). Also deletes all products and coupons."""
    shop = await _verify_shop_owner(shop_id, current_user, db)
    await db.delete(shop)
    await db.flush()
