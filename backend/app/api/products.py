"""
Product API routes — the core of the platform.

== Filtering & Pagination (for Next.js devs) ==

This is the most query-heavy endpoint. Users can filter by:
  - category (slug or ID)
  - shop
  - price range (min/max)
  - search text
  - on_sale (products with original_price > price)

In Next.js, you'd build these as URL search params and use them
in a Prisma `where` clause. Same idea here with SQLAlchemy.

== SQLAlchemy Query Building ==

SQLAlchemy lets you build queries incrementally:
    query = select(Product)              # Start with base query
    if category_id:
        query = query.where(...)         # Add filter conditionally
    if min_price:
        query = query.where(...)         # Stack more filters

This is like Prisma's conditional `where`:
    where: {
      ...(categoryId && { categoryId }),
      ...(minPrice && { price: { gte: minPrice } }),
    }

== Eager Loading with joinedload ==

By default, accessing `product.shop` would trigger ANOTHER SQL query
(the "N+1 problem" — load 20 products, fire 20 extra queries for shops).

`joinedload(Product.shop)` tells SQLAlchemy to fetch the shop in the
SAME query using a SQL JOIN. This is like Prisma's `include: { shop: true }`.
"""

import uuid
import json
import logging
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.redis import redis_client
from app.core.dependencies import get_current_user
from app.models.category import Category
from app.models.product import Product
from app.models.shop import Shop
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    ProductCreate,
    ProductDetailResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["Products"])

logger = logging.getLogger(__name__)
PRODUCT_LIST_CACHE_VERSION_KEY = "products:list:version"


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


async def _cache_get_version(key: str) -> str:
    try:
        version = await redis_client.get(key)
        return str(version or "0")
    except Exception:
        logger.warning("Redis version read failed for key %s", key, exc_info=True)
        return "0"


async def _cache_bump_version(key: str) -> None:
    try:
        await redis_client.incr(key)
    except Exception:
        logger.warning("Redis version bump failed for key %s", key, exc_info=True)


@router.get("", response_model=PaginatedResponse[ProductDetailResponse])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category: str | None = None,
    shop_id: uuid.UUID | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    on_sale: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    List products with filtering, search, and pagination.

    Filters stack — you can combine them:
      GET /products?category=laptops&min_price=500&max_price=1500&on_sale=true
    """
    list_version = await _cache_get_version(PRODUCT_LIST_CACHE_VERSION_KEY)
    cache_key = (
        f"products:list:v{list_version}:{page}:{page_size}:{search}:{category}:"
        f"{shop_id}:{min_price}:{max_price}:{on_sale}"
    )
    cached_data = await _cache_get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    # Base query — only active products, with shop and category loaded
    query = (
        select(Product)
        .where(Product.is_active == True)
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    count_query = select(func.count()).select_from(Product).where(Product.is_active == True)

    # ── Apply filters ────────────────────────────────────────────
    if search:
        # PostgreSQL full-text search via tsvector
        search_filter = Product.search_vector.op("@@")(func.websearch_to_tsquery("english", search))
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if category:
        # Accept both slug ("laptops") and UUID
        try:
            cat_id = uuid.UUID(category)
            cat_filter = Product.category_id == cat_id
        except ValueError:
            # It's a slug — need a subquery
            cat_subquery = select(Category.id).where(Category.slug == category)
            cat_filter = Product.category_id.in_(cat_subquery)

        query = query.where(cat_filter)
        count_query = count_query.where(cat_filter)

    if shop_id:
        query = query.where(Product.shop_id == shop_id)
        count_query = count_query.where(Product.shop_id == shop_id)

    if min_price is not None:
        query = query.where(Product.price >= min_price)
        count_query = count_query.where(Product.price >= min_price)

    if max_price is not None:
        query = query.where(Product.price <= max_price)
        count_query = count_query.where(Product.price <= max_price)

    if on_sale:
        sale_filter = Product.original_price.isnot(None) & (
            Product.original_price > Product.price
        )
        query = query.where(sale_filter)
        count_query = count_query.where(sale_filter)

    # ── Execute ──────────────────────────────────────────────────
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Product.created_at.desc()).offset(offset).limit(page_size)
    )
    products = list(result.scalars().unique().all())

    # Enrich with shop/category names
    items = []
    for p in products:
        item = ProductDetailResponse.model_validate(p)
        item.shop_name = p.shop.name if p.shop else None
        item.category_name = p.category.name if p.category else None
        items.append(item)

    response = PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0,
    )
    
    # Cache for 60 seconds
    await _cache_set(cache_key, response.model_dump_json())
    
    return response


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"product:detail:{product_id}"
    cached_data = await _cache_get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    resp = ProductDetailResponse.model_validate(product)
    resp.shop_name = product.shop.name if product.shop else None
    resp.category_name = product.category.name if product.category else None
    
    # Cache for 60 seconds
    await _cache_set(cache_key, resp.model_dump_json())
    
    return resp


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a product. Must own the shop the product belongs to."""
    # Verify shop ownership
    result = await db.execute(select(Shop).where(Shop.id == data.shop_id))
    shop = result.scalar_one_or_none()
    if shop is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your shop")

    # Verify category exists
    cat_result = await db.execute(select(Category).where(Category.id == data.category_id))
    if cat_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Category not found")

    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()
    await _cache_delete(f"product:detail:{product.id}")
    await _cache_bump_version(PRODUCT_LIST_CACHE_VERSION_KEY)
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a product. Must own the shop it belongs to."""
    result = await db.execute(
        select(Product).where(Product.id == product_id).options(joinedload(Product.shop))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.shop.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your shop")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.flush()
    await _cache_delete(f"product:detail:{product_id}")
    await _cache_bump_version(PRODUCT_LIST_CACHE_VERSION_KEY)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a product. Must own the shop it belongs to."""
    result = await db.execute(
        select(Product).where(Product.id == product_id).options(joinedload(Product.shop))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.shop.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your shop")

    await db.delete(product)
    await db.flush()
    await _cache_delete(f"product:detail:{product_id}")
    await _cache_bump_version(PRODUCT_LIST_CACHE_VERSION_KEY)
