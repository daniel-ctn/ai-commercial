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

import json
import logging
import uuid
from math import ceil

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
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
    ShopStatsResponse,
    BulkActionResponse,
    QualityReportResponse,
    AiTextResponse,
    DataQualityStats,
    CategoryCount,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Dashboard Stats ───────────────────────────────────────────────


@router.get("/stats", response_model=AdminStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Aggregate stats for the admin dashboard in a single query."""
    stats_query = select(
        func.count(func.distinct(User.id)).label("total_users"),
        (
            select(func.count()).select_from(Shop)
        ).correlate(None).scalar_subquery().label("total_shops"),
        (
            select(func.count()).select_from(Shop).where(Shop.is_active == True)
        ).correlate(None).scalar_subquery().label("active_shops"),
        (
            select(func.count()).select_from(Product)
        ).correlate(None).scalar_subquery().label("total_products"),
        (
            select(func.count()).select_from(Product).where(Product.is_active == True)
        ).correlate(None).scalar_subquery().label("active_products"),
        (
            select(func.count()).select_from(Coupon)
        ).correlate(None).scalar_subquery().label("total_coupons"),
        (
            select(func.count()).select_from(Coupon).where(Coupon.is_active == True)
        ).correlate(None).scalar_subquery().label("active_coupons"),
        (
            select(func.count()).select_from(Category)
        ).correlate(None).scalar_subquery().label("total_categories"),
    ).select_from(User)

    row = (await db.execute(stats_query)).one()

    missing_images = (await db.execute(
        select(func.count()).select_from(Product)
        .where((Product.image_url == None) | (Product.image_url == ""))
    )).scalar() or 0

    missing_descriptions = (await db.execute(
        select(func.count()).select_from(Product)
        .where((Product.description == None) | (Product.description == ""))
    )).scalar() or 0

    missing_attributes = (await db.execute(
        select(func.count()).select_from(Product)
        .where((Product.attributes == None) | (Product.attributes == {}))
    )).scalar() or 0

    by_cat_rows = (await db.execute(
        select(Category.name, func.count(Product.id).label("count"))
        .join(Product, Product.category_id == Category.id, isouter=True)
        .group_by(Category.name)
        .order_by(func.count(Product.id).desc())
    )).all()

    return AdminStatsResponse(
        total_users=row.total_users,
        total_shops=row.total_shops,
        active_shops=row.active_shops,
        total_products=row.total_products,
        active_products=row.active_products,
        total_coupons=row.total_coupons,
        active_coupons=row.active_coupons,
        total_categories=row.total_categories,
        data_quality=DataQualityStats(
            missing_images=missing_images,
            missing_descriptions=missing_descriptions,
            missing_attributes=missing_attributes,
        ),
        products_by_category=[
            CategoryCount(category=r[0], count=r[1]) for r in by_cat_rows
        ],
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


# ── Shop Stats ────────────────────────────────────────────────


@router.get("/shops/{shop_id}/stats", response_model=ShopStatsResponse)
async def get_shop_stats(
    shop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Shop).where(Shop.id == shop_id))
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    total_products = (await db.execute(
        select(func.count()).select_from(Product).where(Product.shop_id == shop_id)
    )).scalar() or 0
    active_products = (await db.execute(
        select(func.count()).select_from(Product)
        .where(Product.shop_id == shop_id, Product.is_active == True)
    )).scalar() or 0
    total_coupons = (await db.execute(
        select(func.count()).select_from(Coupon).where(Coupon.shop_id == shop_id)
    )).scalar() or 0
    active_coupons = (await db.execute(
        select(func.count()).select_from(Coupon)
        .where(Coupon.shop_id == shop_id, Coupon.is_active == True)
    )).scalar() or 0
    missing_img = (await db.execute(
        select(func.count()).select_from(Product)
        .where(Product.shop_id == shop_id)
        .where((Product.image_url == None) | (Product.image_url == ""))
    )).scalar() or 0
    missing_desc = (await db.execute(
        select(func.count()).select_from(Product)
        .where(Product.shop_id == shop_id)
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


# ── Bulk Actions ──────────────────────────────────────────────


@router.post("/products/bulk-toggle", response_model=BulkActionResponse)
async def bulk_toggle_products(
    ids: list[uuid.UUID] = Body(..., embed=False),
    activate: bool = Body(..., embed=False),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        update(Product).where(Product.id.in_(ids)).values(is_active=activate)
    )
    return BulkActionResponse(affected=result.rowcount)


@router.post("/coupons/bulk-toggle", response_model=BulkActionResponse)
async def bulk_toggle_coupons(
    ids: list[uuid.UUID] = Body(..., embed=False),
    activate: bool = Body(..., embed=False),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        update(Coupon).where(Coupon.id.in_(ids)).values(is_active=activate)
    )
    return BulkActionResponse(affected=result.rowcount)


@router.post("/products/bulk-category", response_model=BulkActionResponse)
async def bulk_assign_category(
    ids: list[uuid.UUID] = Body(..., embed=False),
    category_id: uuid.UUID = Body(..., embed=False),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    cat = (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    result = await db.execute(
        update(Product).where(Product.id.in_(ids)).values(category_id=category_id)
    )
    return BulkActionResponse(affected=result.rowcount)


# ── AI Catalog Tools ──────────────────────────────────────────


@router.post("/products/{product_id}/ai-description", response_model=AiTextResponse)
async def generate_ai_description(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        from google import genai as genai_mod
        client = genai_mod.Client(api_key=settings.gemini_api_key)
    except Exception:
        return AiTextResponse(description="AI unavailable. Set GEMINI_API_KEY.")

    context_parts = [
        f"Product: {product.name}",
        f"Category: {product.category.name}" if product.category else None,
        f"Sold by: {product.shop.name}" if product.shop else None,
        f"Price: ${product.price}",
        f"Original price: ${product.original_price}" if product.original_price else None,
        f"Attributes: {json.dumps(product.attributes)}" if product.attributes else None,
        f"Current description: {product.description}" if product.description else None,
    ]
    context = "\n".join(p for p in context_parts if p)

    prompt = (
        "Write a compelling, professional product description for an e-commerce listing. "
        "Use the information below. Keep it concise (2-3 sentences), highlight key selling points, "
        "and make it suitable for a product page. Do not add information not present below.\n\n"
        f"{context}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt,
            config={"temperature": 0.7, "max_output_tokens": 300},
        )
        return AiTextResponse(description=response.text or "Unable to generate.")
    except Exception as e:
        logger.error("AI description generation failed: %s", e)
        return AiTextResponse(description="AI temporarily unavailable.")


@router.post("/products/{product_id}/ai-attributes", response_model=AiTextResponse)
async def generate_ai_attributes(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.category))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        from google import genai as genai_mod
        client = genai_mod.Client(api_key=settings.gemini_api_key)
    except Exception:
        return AiTextResponse(attributes={})

    context_parts = [
        f"Product: {product.name}",
        f"Category: {product.category.name}" if product.category else None,
        f"Description: {product.description}" if product.description else None,
        f"Current attributes: {json.dumps(product.attributes)}" if product.attributes else None,
    ]
    context = "\n".join(p for p in context_parts if p)

    prompt = (
        "Based on the product info below, suggest 3-6 structured key-value attributes "
        '(like "Material: Stainless Steel", "Weight: 250g") that would help shoppers compare products. '
        "Respond ONLY with a valid JSON object, no explanation. Only infer from the given data.\n\n"
        f"{context}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt,
            config={"temperature": 0.3, "max_output_tokens": 300},
        )
        text = (response.text or "").replace("```json\n", "").replace("\n```", "").strip()
        parsed = json.loads(text)
        return AiTextResponse(attributes=parsed)
    except Exception as e:
        logger.error("AI attribute generation failed: %s", e)
        return AiTextResponse(attributes={})


@router.get("/products/{product_id}/quality", response_model=QualityReportResponse)
async def get_quality_report(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id)
        .options(joinedload(Product.category))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    issues: list[str] = []
    suggestions: list[str] = []
    score = 100

    if not product.image_url:
        issues.append("Missing product image")
        suggestions.append("Add a high-quality product image to improve click-through rates")
        score -= 25
    if not product.description or len(product.description) < 20:
        issues.append("Missing or very short description")
        suggestions.append("Add a detailed description (2-3 sentences minimum)")
        score -= 25
    if not product.attributes or len(product.attributes) == 0:
        issues.append("No product attributes/specifications")
        suggestions.append("Add attributes like material, dimensions, or weight for better search")
        score -= 15
    if not product.original_price:
        suggestions.append("Consider adding an original price to show deal value")
        score -= 5
    if not product.category_id:
        issues.append("Not assigned to a category")
        suggestions.append("Assign a category for better discoverability")
        score -= 15
    if len(product.name) < 10:
        issues.append("Product name is very short")
        suggestions.append("Use a more descriptive product name")
        score -= 15

    return QualityReportResponse(score=max(0, score), issues=issues, suggestions=suggestions)
