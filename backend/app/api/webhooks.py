import logging

import stripe
from fastapi import APIRouter, HTTPException, Header, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session
from app.models.cart import Cart, CartItem
from app.models.order import Order

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature"),
):
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Stripe not configured")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        logger.error("Webhook signature verification failed")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid signature")

    async with async_session() as db:
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            order_id = session.get("metadata", {}).get("order_id")
            if order_id:
                order = await db.get(Order, order_id)
                if order:
                    order.status = "paid"
                    order.stripe_payment_intent_id = session.get("payment_intent")

                    result = await db.execute(
                        select(Cart).where(Cart.user_id == order.user_id)
                    )
                    cart = result.scalar_one_or_none()
                    if cart:
                        await db.execute(
                            CartItem.__table__.delete().where(CartItem.cart_id == cart.id)
                        )

                    await db.commit()
                    logger.info("Order %s marked as paid", order_id)

        elif event["type"] == "charge.refunded":
            charge = event["data"]["object"]
            payment_intent_id = charge.get("payment_intent")
            if payment_intent_id:
                result = await db.execute(
                    select(Order).where(Order.stripe_payment_intent_id == payment_intent_id)
                )
                order = result.scalar_one_or_none()
                if order:
                    order.status = "refunded"
                    await db.commit()
                    logger.info("Order %s refunded", order.id)

    return {"received": True}
