import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.favorite import Favorite
from app.models.product import Product
from app.models.user import User

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("")
async def list_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .options(
            joinedload(Favorite.product).joinedload(Product.shop),
            joinedload(Favorite.product).joinedload(Product.category),
        )
        .order_by(Favorite.created_at.desc())
    )
    favorites = result.scalars().unique().all()

    return [
        {
            "id": str(fav.product.id),
            "name": fav.product.name,
            "price": float(fav.product.price),
            "original_price": float(fav.product.original_price)
            if fav.product.original_price
            else None,
            "image_url": fav.product.image_url,
            "shop_id": str(fav.product.shop_id),
            "shop_name": fav.product.shop.name if fav.product.shop else None,
            "category_id": str(fav.product.category_id),
            "category_name": fav.product.category.name
            if fav.product.category
            else None,
            "favorited_at": fav.created_at.isoformat(),
        }
        for fav in favorites
    ]


@router.get("/ids")
async def get_favorite_ids(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite.product_id).where(Favorite.user_id == current_user.id)
    )
    return [str(row[0]) for row in result.all()]


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    existing = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.product_id == product_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product already in favorites",
        )

    fav = Favorite(user_id=current_user.id, product_id=product_id)
    db.add(fav)
    await db.commit()
    return {"status": "added"}


@router.delete("/{product_id}")
async def remove_favorite(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        delete(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.product_id == product_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found"
        )
    await db.commit()
    return {"status": "removed"}
