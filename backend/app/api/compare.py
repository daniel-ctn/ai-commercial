"""
Product comparison API route.

== How It Works (for Next.js devs) ==

The compare endpoint accepts a list of product IDs via query params
and returns a normalized comparison view. The key addition over a
regular product list is `attribute_keys` — the union of all JSONB
attribute keys across the compared products, sorted alphabetically.

This lets the frontend render a comparison table where each row is an
attribute and each column is a product, filling in "—" for missing values.

== Query Param Lists ==

FastAPI supports `?ids=uuid1&ids=uuid2` natively when the param type is
`list[uuid.UUID]`. This is like Next.js `searchParams.getAll("ids")`.
"""

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.database import get_db
from app.models.product import Product
from app.schemas.compare import CompareProductItem, CompareResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compare", tags=["compare"])


@router.get("", response_model=CompareResponse)
async def compare_products(
    ids: list[uuid.UUID] = Query(
        ...,
        min_length=2,
        max_length=5,
        description="Product IDs to compare (2–5)",
    ),
    db: AsyncSession = Depends(get_db),
):
    ordered_ids = list(dict.fromkeys(ids))
    result = await db.execute(
        select(Product)
        .where(Product.id.in_(ordered_ids), Product.is_active.is_(True))
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    products = list(result.scalars().unique().all())
    products_by_id = {product.id: product for product in products}
    ordered_products = [
        products_by_id[product_id]
        for product_id in ordered_ids
        if product_id in products_by_id
    ]

    if len(ordered_products) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Need at least 2 active products to compare",
        )

    all_keys: set[str] = set()
    items: list[CompareProductItem] = []

    for p in ordered_products:
        if p.attributes:
            all_keys.update(p.attributes.keys())

        items.append(
            CompareProductItem(
                id=p.id,
                name=p.name,
                description=p.description,
                price=float(p.price),
                original_price=float(p.original_price) if p.original_price else None,
                image_url=p.image_url,
                attributes=p.attributes,
                shop_name=p.shop.name if p.shop else None,
                category_name=p.category.name if p.category else None,
                on_sale=p.original_price is not None and p.original_price > p.price,
            )
        )

    return CompareResponse(
        products=items,
        attribute_keys=sorted(all_keys),
    )


@router.get("/summary")
async def compare_summary(
    ids: list[uuid.UUID] = Query(
        ...,
        min_length=2,
        max_length=5,
        description="Product IDs to generate AI summary for",
    ),
    db: AsyncSession = Depends(get_db),
):
    if not settings.gemini_api_key:
        return {"summary": "AI summary is not available. Set GEMINI_API_KEY to enable this feature."}

    ordered_ids = list(dict.fromkeys(ids))
    result = await db.execute(
        select(Product)
        .where(Product.id.in_(ordered_ids), Product.is_active.is_(True))
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    products = list(result.scalars().unique().all())
    products_by_id = {p.id: p for p in products}
    ordered = [products_by_id[pid] for pid in ordered_ids if pid in products_by_id]

    if len(ordered) < 2:
        return {"summary": "Could not find enough products to compare."}

    product_descriptions = []
    for i, p in enumerate(ordered):
        parts = [
            f"Product {i+1}: {p.name}",
            f"  Price: ${float(p.price)}",
        ]
        if p.original_price and p.original_price > p.price:
            discount = round((1 - float(p.price) / float(p.original_price)) * 100)
            parts.append(f"  Original price: ${float(p.original_price)} ({discount}% off)")
        if p.shop:
            parts.append(f"  Shop: {p.shop.name}")
        if p.category:
            parts.append(f"  Category: {p.category.name}")
        if p.description:
            parts.append(f"  Description: {p.description[:200]}")
        if p.attributes:
            parts.append(f"  Specs: {json.dumps(p.attributes)}")
        product_descriptions.append("\n".join(parts))

    prompt = (
        f"Compare these {len(ordered)} products and provide a concise shopping summary. Include:\n"
        "1. **Best for price** — which product offers the lowest price or best discount\n"
        "2. **Best for features** — which product has the strongest specs or attributes\n"
        "3. **Best overall** — your recommendation considering price-to-value ratio\n\n"
        "Only reference data that is actually provided below. Do not invent features or specs.\n"
        "Keep the summary under 200 words. Use markdown formatting (bold, bullet points).\n\n"
        + "\n\n".join(product_descriptions)
    )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.5, max_output_tokens=512),
        )
        return {"summary": response.text or "Unable to generate summary."}
    except Exception:
        logger.exception("Failed to generate compare summary")
        return {"summary": "AI summary temporarily unavailable. Please try again later."}
