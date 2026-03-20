"""
Models package — imports all models so Alembic can discover them.

== Why this file matters ==

Alembic (our migration tool, like Prisma Migrate) auto-detects models
by looking at everything that inherits from `Base`. But Python only
"knows about" a class after it's been imported.

If we DON'T import the models here, Alembic would generate an empty
migration because it never saw the model classes. This __init__.py
ensures all models are loaded when anyone does:

    from app.models import User, Product, ...

Think of it like a barrel file (index.ts) that re-exports everything.
"""

from app.models.user import User
from app.models.shop import Shop
from app.models.category import Category
from app.models.product import Product
from app.models.coupon import Coupon
from app.models.chat import ChatSession, ChatMessage
from app.models.favorite import Favorite
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem

__all__ = [
    "User",
    "Shop",
    "Category",
    "Product",
    "Coupon",
    "ChatSession",
    "ChatMessage",
    "Favorite",
    "Cart",
    "CartItem",
    "Order",
    "OrderItem",
]
