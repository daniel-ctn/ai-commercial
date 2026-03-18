"""
AI Chat Service — Google Gemini integration with function-calling tools.

== Function Calling (for Next.js devs) ==

Gemini function calling is similar to Vercel AI SDK's tools.
You define functions the model can "call" by describing their name, description,
and parameters (like a JSON Schema). When the user asks something that requires
data lookup, Gemini returns a "function call" instead of text, saying:
"I need to call search_products with these args."

We then:
  1. Execute that function against our database
  2. Send the result back to Gemini
  3. Gemini formulates a natural-language response using the data

This loop can repeat if the model needs to call multiple tools.

== SSE Streaming ==

We use Server-Sent Events (SSE) to stream the response to the frontend.
Events are sent as things happen:
  - "status" — progress updates (e.g., "Searching products...")
  - "chunk"  — text content from the AI
  - "done"   — complete response text
  - "error"  — error information
"""

import json
import logging
import uuid as uuid_mod
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from google import genai
from google.genai import types
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.models.category import Category
from app.models.coupon import Coupon
from app.models.product import Product
from app.models.shop import Shop

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """\
You are a helpful shopping assistant for AI Commercial, an online platform \
where users browse products, compare prices, and find coupons/deals.

Your capabilities via tools:
- Search products by name, category, or price range
- Get detailed product information
- Find active coupons and deals
- Look up shop information and their product catalog
- Compare products side by side

Guidelines:
- Always use tools to look up real data — never invent products or prices.
- When mentioning products, include the name, price, and shop name.
- If a product is on sale, highlight the original price and the discount.
- When showing coupons, include the code, discount amount, and expiry.
- Be concise and helpful. Use bullet points or short paragraphs.
- If no results are found, say so and suggest alternatives or broader searches.
- For product comparisons, highlight key differences (price, features, shop).
"""

# ── Function Declarations ─────────────────────────────────────────
# These tell Gemini what tools it can call and what parameters they accept.
# Think of them like an OpenAPI spec for internal functions.

TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_products",
        description=(
            "Search for products by name, category, or price range. "
            "Returns up to 10 matching active products with pricing and shop info."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term to match against product names",
                },
                "category": {
                    "type": "string",
                    "description": "Category slug to filter by (e.g., 'laptops', 'phones')",
                },
                "min_price": {
                    "type": "number",
                    "description": "Minimum price filter",
                },
                "max_price": {
                    "type": "number",
                    "description": "Maximum price filter",
                },
                "on_sale": {
                    "type": "boolean",
                    "description": "If true, only return products currently on sale",
                },
            },
        },
    ),
    types.FunctionDeclaration(
        name="get_product_details",
        description=(
            "Get full details of a specific product including attributes, "
            "description, and pricing."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "string",
                    "description": "The UUID of the product",
                },
            },
            "required": ["product_id"],
        },
    ),
    types.FunctionDeclaration(
        name="find_coupons",
        description="Find currently active coupons and deals, optionally filtered by shop name.",
        parameters_json_schema={
            "type": "object",
            "properties": {
                "shop_name": {
                    "type": "string",
                    "description": "Filter coupons by shop name (partial match)",
                },
            },
        },
    ),
    types.FunctionDeclaration(
        name="get_shop_info",
        description=(
            "Get information about a shop including its product catalog "
            "and active coupons."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "shop_name": {
                    "type": "string",
                    "description": "The name of the shop to look up (partial match)",
                },
            },
            "required": ["shop_name"],
        },
    ),
    types.FunctionDeclaration(
        name="compare_products",
        description="Compare 2–5 products side by side. Returns detailed info for each product.",
        parameters_json_schema={
            "type": "object",
            "properties": {
                "product_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of 2–5 product UUIDs to compare",
                },
            },
            "required": ["product_ids"],
        },
    ),
]

gemini_tools = types.Tool(function_declarations=TOOL_DECLARATIONS)


# ── Tool Handlers ─────────────────────────────────────────────────
# Each handler runs a DB query and returns a dict that Gemini can read.
# These mirror the patterns in api/products.py and api/coupons.py.

async def _search_products(db: AsyncSession, args: dict) -> dict:
    query = (
        select(Product)
        .where(Product.is_active == True)  # noqa: E712
        .options(joinedload(Product.shop), joinedload(Product.category))
    )

    if search := args.get("query"):
        query = query.where(Product.name.ilike(f"%{search}%"))

    if category_slug := args.get("category"):
        cat_subquery = select(Category.id).where(Category.slug == category_slug)
        query = query.where(Product.category_id.in_(cat_subquery))

    if (min_price := args.get("min_price")) is not None:
        query = query.where(Product.price >= min_price)

    if (max_price := args.get("max_price")) is not None:
        query = query.where(Product.price <= max_price)

    if args.get("on_sale"):
        query = query.where(
            Product.original_price.isnot(None) & (Product.original_price > Product.price)
        )

    result = await db.execute(query.order_by(Product.created_at.desc()).limit(10))
    products = list(result.scalars().unique().all())

    return {
        "products": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": (p.description or "")[:200],
                "price": float(p.price),
                "original_price": float(p.original_price) if p.original_price else None,
                "image_url": p.image_url,
                "shop_name": p.shop.name if p.shop else None,
                "category_name": p.category.name if p.category else None,
                "on_sale": p.original_price is not None and p.original_price > p.price,
            }
            for p in products
        ],
        "total_found": len(products),
    }


async def _get_product_details(db: AsyncSession, args: dict) -> dict:
    try:
        product_id = uuid_mod.UUID(args["product_id"])
    except (ValueError, KeyError):
        return {"error": "Invalid product ID"}

    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    product = result.scalar_one_or_none()

    if not product:
        return {"error": "Product not found"}

    return {
        "id": str(product.id),
        "name": product.name,
        "description": product.description,
        "price": float(product.price),
        "original_price": float(product.original_price) if product.original_price else None,
        "image_url": product.image_url,
        "attributes": product.attributes,
        "shop_name": product.shop.name if product.shop else None,
        "category_name": product.category.name if product.category else None,
        "on_sale": product.original_price is not None and product.original_price > product.price,
    }


async def _find_coupons(db: AsyncSession, args: dict) -> dict:
    now = datetime.now(timezone.utc)
    query = (
        select(Coupon)
        .where(
            and_(
                Coupon.is_active == True,  # noqa: E712
                Coupon.valid_from <= now,
                Coupon.valid_until >= now,
            )
        )
        .options(joinedload(Coupon.shop))
    )

    if shop_name := args.get("shop_name"):
        shop_subquery = select(Shop.id).where(Shop.name.ilike(f"%{shop_name}%"))
        query = query.where(Coupon.shop_id.in_(shop_subquery))

    result = await db.execute(query.order_by(Coupon.valid_until.asc()).limit(20))
    coupons = list(result.scalars().unique().all())

    return {
        "coupons": [
            {
                "id": str(c.id),
                "code": c.code,
                "description": c.description,
                "discount_type": c.discount_type,
                "discount_value": float(c.discount_value),
                "min_purchase": float(c.min_purchase) if c.min_purchase else None,
                "valid_until": c.valid_until.isoformat(),
                "shop_name": c.shop.name if c.shop else None,
            }
            for c in coupons
        ],
        "total_found": len(coupons),
    }


async def _get_shop_info(db: AsyncSession, args: dict) -> dict:
    shop_name = args.get("shop_name", "")

    result = await db.execute(
        select(Shop).where(Shop.name.ilike(f"%{shop_name}%"), Shop.is_active == True)  # noqa: E712
    )
    shop = result.scalar_one_or_none()

    if not shop:
        return {"error": f"No shop found matching '{shop_name}'"}

    products_result = await db.execute(
        select(Product)
        .where(Product.shop_id == shop.id, Product.is_active == True)  # noqa: E712
        .options(joinedload(Product.category))
        .order_by(Product.created_at.desc())
        .limit(10)
    )
    products = list(products_result.scalars().unique().all())

    now = datetime.now(timezone.utc)
    coupons_result = await db.execute(
        select(Coupon).where(
            Coupon.shop_id == shop.id,
            Coupon.is_active == True,  # noqa: E712
            Coupon.valid_from <= now,
            Coupon.valid_until >= now,
        )
    )
    coupons = list(coupons_result.scalars().all())

    return {
        "shop": {
            "id": str(shop.id),
            "name": shop.name,
            "description": shop.description,
            "website": shop.website,
        },
        "products": [
            {
                "id": str(p.id),
                "name": p.name,
                "price": float(p.price),
                "original_price": float(p.original_price) if p.original_price else None,
                "category_name": p.category.name if p.category else None,
            }
            for p in products
        ],
        "active_coupons": [
            {
                "code": c.code,
                "description": c.description,
                "discount_type": c.discount_type,
                "discount_value": float(c.discount_value),
                "valid_until": c.valid_until.isoformat(),
            }
            for c in coupons
        ],
    }


async def _compare_products(db: AsyncSession, args: dict) -> dict:
    raw_ids = args.get("product_ids", [])
    try:
        product_ids = [uuid_mod.UUID(pid) for pid in raw_ids]
    except ValueError:
        return {"error": "One or more invalid product IDs"}

    if len(product_ids) < 2:
        return {"error": "Need at least 2 products to compare"}
    if len(product_ids) > 5:
        return {"error": "Can compare at most 5 products"}

    result = await db.execute(
        select(Product)
        .where(Product.id.in_(product_ids))
        .options(joinedload(Product.shop), joinedload(Product.category))
    )
    products = list(result.scalars().unique().all())

    if len(products) < 2:
        return {"error": "Could not find enough products to compare"}

    return {
        "products": [
            {
                "id": str(p.id),
                "name": p.name,
                "description": (p.description or "")[:200],
                "price": float(p.price),
                "original_price": float(p.original_price) if p.original_price else None,
                "attributes": p.attributes,
                "shop_name": p.shop.name if p.shop else None,
                "category_name": p.category.name if p.category else None,
                "on_sale": p.original_price is not None and p.original_price > p.price,
            }
            for p in products
        ],
    }


_TOOL_HANDLERS: dict[str, Any] = {
    "search_products": _search_products,
    "get_product_details": _get_product_details,
    "find_coupons": _find_coupons,
    "get_shop_info": _get_shop_info,
    "compare_products": _compare_products,
}


async def _execute_tool(name: str, args: dict, db: AsyncSession) -> dict:
    handler = _TOOL_HANDLERS.get(name)
    if not handler:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await handler(db, args)
    except Exception:
        logger.exception("Tool execution error for %s", name)
        return {"error": f"Failed to execute {name}"}


# ── SSE Event Helper ──────────────────────────────────────────────

class ChatEvent:
    """A single Server-Sent Event to stream to the client."""

    def __init__(self, event: str, data: dict):
        self.event = event
        self.data = data

    def to_sse(self) -> str:
        return f"event: {self.event}\ndata: {json.dumps(self.data)}\n\n"


# ── Main Chat Generation ─────────────────────────────────────────

_TOOL_DISPLAY_NAMES = {
    "search_products": "Searching products",
    "get_product_details": "Getting product details",
    "find_coupons": "Finding coupons",
    "get_shop_info": "Looking up shop info",
    "compare_products": "Comparing products",
}

MAX_TOOL_ROUNDS = 5


async def generate_chat_response(
    messages: list[dict[str, str]],
    db: AsyncSession,
) -> AsyncGenerator[ChatEvent, None]:
    """
    Generate an AI chat response using Gemini with function-calling tools.

    This is an async generator that yields SSE events:
    - ChatEvent("status", ...) — progress during tool execution
    - ChatEvent("chunk", ...)  — text content from the model
    - ChatEvent("done", ...)   — final complete response
    - ChatEvent("error", ...)  — error information

    The function-calling loop:
    1. Send conversation history + tools to Gemini
    2. If Gemini returns function calls → execute them, feed results back
    3. Repeat until Gemini returns text (or we hit MAX_TOOL_ROUNDS)
    """
    if not settings.gemini_api_key:
        yield ChatEvent("error", {"message": "AI service is not configured. Set GEMINI_API_KEY."})
        return

    client = genai.Client(api_key=settings.gemini_api_key)

    contents: list[types.Content] = []
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append(
            types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])])
        )

    config = types.GenerateContentConfig(
        tools=[gemini_tools],
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.7,
        max_output_tokens=2048,
    )

    for _round in range(MAX_TOOL_ROUNDS):
        try:
            response = await client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config=config,
            )
        except Exception:
            logger.exception("Gemini API error")
            yield ChatEvent("error", {"message": "AI service temporarily unavailable. Please try again."})
            return

        if not response.function_calls:
            text = response.text or "I'm not sure how to help with that. Could you try rephrasing?"
            yield ChatEvent("chunk", {"text": text})
            yield ChatEvent("done", {"text": text})
            return

        # Model wants to call tools — execute them and loop back
        contents.append(response.candidates[0].content)

        function_response_parts: list[types.Part] = []
        for fc in response.function_calls:
            display = _TOOL_DISPLAY_NAMES.get(fc.name, fc.name)
            yield ChatEvent("status", {"message": f"{display}..."})

            result = await _execute_tool(fc.name, fc.args or {}, db)
            function_response_parts.append(
                types.Part.from_function_response(name=fc.name, response=result)
            )

        contents.append(types.Content(role="tool", parts=function_response_parts))

    fallback = "I had trouble processing your request. Could you try asking in a different way?"
    yield ChatEvent("chunk", {"text": fallback})
    yield ChatEvent("done", {"text": fallback})
