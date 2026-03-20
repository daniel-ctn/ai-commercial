import logging
import uuid
from math import ceil

import stripe
from fastapi import APIRouter, Body, Depends, HTTPException, Header, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.cart import Cart, CartItem
from app.models.coupon import Coupon
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    CheckoutRequest,
    CheckoutResponse,
    OrderResponse,
    OrderItemResponse,
    UpdateOrderStatusRequest,
)
from app.schemas.common import PaginatedResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


def _order_response(order: Order) -> dict:
    items = []
    for item in (order.items or []):
        items.append(
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                shop_id=item.shop_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                line_total=float(item.line_total),
            ).model_dump()
        )

    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        status=order.status,
        subtotal=float(order.subtotal),
        discount=float(order.discount),
        total=float(order.total),
        shipping_name=order.shipping_name,
        shipping_address=order.shipping_address,
        stripe_session_id=order.stripe_session_id,
        items=items,
        created_at=order.created_at,
        updated_at=order.updated_at,
    ).model_dump()


@router.post("/checkout")
async def checkout(
    body: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payments are not configured")

    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.shop)
        )
    )
    cart = result.unique().scalar_one_or_none()
    if not cart or not cart.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cart is empty")

    subtotal = sum(float(i.unit_price) * i.quantity for i in cart.items)
    discount = 0.0
    coupon_id = None

    if body.coupon_code:
        result = await db.execute(
            select(Coupon).where(Coupon.code == body.coupon_code, Coupon.is_active == True)
        )
        coupon = result.scalar_one_or_none()
        if not coupon:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired coupon")

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if now < coupon.valid_from or now > coupon.valid_until:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Coupon is not currently valid")

        if coupon.min_purchase and subtotal < float(coupon.min_purchase):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Minimum purchase of ${coupon.min_purchase} required",
            )

        if coupon.discount_type == "percentage":
            discount = round(subtotal * (float(coupon.discount_value) / 100), 2)
        else:
            discount = round(float(coupon.discount_value), 2)

        coupon_id = coupon.id

    total = round(max(0, subtotal - discount), 2)

    order = Order(
        user_id=current_user.id,
        coupon_id=coupon_id,
        status="pending",
        subtotal=round(subtotal, 2),
        discount=discount,
        total=total,
        shipping_name=body.shipping_name,
        shipping_address=body.shipping_address,
    )
    db.add(order)
    await db.flush()

    for item in cart.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            shop_id=item.product.shop_id if item.product else None,
            product_name=item.product.name if item.product else "Unknown",
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_total=round(float(item.unit_price) * item.quantity, 2),
        )
        db.add(order_item)

    line_items = []
    for item in cart.items:
        line_items.append({
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": item.product.name if item.product else "Product",
                    "images": [item.product.image_url] if item.product and item.product.image_url else [],
                },
                "unit_amount": round(float(item.unit_price) * 100),
            },
            "quantity": item.quantity,
        })

    session_params = {
        "payment_method_types": ["card"],
        "mode": "payment",
        "line_items": line_items,
        "metadata": {"order_id": str(order.id)},
        "success_url": f"{settings.frontend_url}/orders/{order.id}?status=success",
        "cancel_url": f"{settings.frontend_url}/cart?status=cancelled",
    }

    if discount > 0:
        stripe_coupon = stripe.Coupon.create(
            amount_off=round(discount * 100),
            currency="usd",
            duration="once",
        )
        session_params["discounts"] = [{"coupon": stripe_coupon.id}]

    session = stripe.checkout.Session.create(**session_params)
    order.stripe_session_id = session.id

    await db.commit()
    await db.refresh(order)

    return CheckoutResponse(checkout_url=session.url, order_id=order.id).model_dump()


@router.get("/my")
async def get_my_orders(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count_result = await db.execute(
        select(func.count(Order.id)).where(Order.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    orders = result.unique().scalars().all()

    return PaginatedResponse(
        items=[_order_response(o) for o in orders],
        total=total,
        page=page,
        pages=ceil(total / limit) if total else 1,
    ).model_dump()


@router.get("/{order_id}")
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(joinedload(Order.items))
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return _order_response(order)


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    body: UpdateOrderStatusRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    order.status = body.status
    await db.commit()
    await db.refresh(order)
    return {"id": str(order.id), "status": order.status}
