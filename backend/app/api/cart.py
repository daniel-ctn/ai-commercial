import uuid
import logging

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import (
    AddToCartRequest,
    UpdateCartItemRequest,
    CartResponse,
    CartItemResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cart", tags=["Cart"])


async def _get_or_create_cart(db: AsyncSession, user_id: uuid.UUID) -> Cart:
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.shop)
        )
    )
    cart = result.unique().scalar_one_or_none()

    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.flush()
        cart.items = []

    return cart


def _cart_response(cart: Cart) -> dict:
    items = []
    subtotal = 0.0
    item_count = 0

    for item in cart.items:
        line_total = round(float(item.unit_price) * item.quantity, 2)
        subtotal += line_total
        item_count += item.quantity
        items.append(
            CartItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "Unknown",
                product_image=item.product.image_url if item.product else None,
                shop_name=item.product.shop.name if item.product and item.product.shop else "Unknown",
                shop_id=item.product.shop_id if item.product else None,
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                line_total=line_total,
            )
        )

    return CartResponse(
        id=cart.id,
        items=items,
        subtotal=round(subtotal, 2),
        discount=0,
        total=round(subtotal, 2),
        item_count=item_count,
    ).model_dump()


@router.get("")
async def get_cart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, current_user.id)
    return _cart_response(cart)


@router.post("/items")
async def add_item(
    body: AddToCartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = await db.get(Product, body.product_id)
    if not product or not product.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found or inactive")

    cart = await _get_or_create_cart(db, current_user.id)

    existing = next((i for i in cart.items if i.product_id == body.product_id), None)
    if existing:
        existing.quantity += body.quantity
        existing.unit_price = product.price
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=body.product_id,
            quantity=body.quantity,
            unit_price=product.price,
        )
        db.add(item)

    await db.commit()

    cart = await _get_or_create_cart(db, current_user.id)
    return _cart_response(cart)


@router.patch("/items/{item_id}")
async def update_item(
    item_id: uuid.UUID,
    body: UpdateCartItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, current_user.id)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cart item not found")

    item.quantity = body.quantity
    await db.commit()

    cart = await _get_or_create_cart(db, current_user.id)
    return _cart_response(cart)


@router.delete("/items/{item_id}")
async def remove_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, current_user.id)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cart item not found")

    await db.delete(item)
    await db.commit()

    cart = await _get_or_create_cart(db, current_user.id)
    return _cart_response(cart)


@router.delete("")
async def clear_cart(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = await _get_or_create_cart(db, current_user.id)
    for item in list(cart.items):
        await db.delete(item)
    await db.commit()
    return {"detail": "Cart cleared"}
