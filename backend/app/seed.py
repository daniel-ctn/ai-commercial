"""
Seed script — populates the database with sample data for development.

== How to run ==

    cd backend
    python -m app.seed

== What is seeding? ==

Seeding = filling the database with fake data so you can develop and test
without manually creating records. In Next.js/Prisma you'd have a
`prisma/seed.ts` file. This is the Python equivalent.

This script:
  1. Connects to your Neon PostgreSQL database
  2. Creates the tables if they don't exist (using SQLAlchemy models)
  3. Checks if data already exists (to avoid duplicates on re-run)
  4. Inserts sample users, shops, categories, products, and coupons

== asyncio.run() ==

Python's `async/await` works like JavaScript's, but with one difference:
you need `asyncio.run()` to start the event loop. In JS the event loop
is always running; in Python you have to explicitly launch it.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import engine, async_session, Base
from app.core.security import hash_password
from app.models import User, Shop, Category, Product, Coupon


async def seed() -> None:
    """Insert sample data into all tables."""

    # Create tables if they don't exist (safe to run multiple times)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if data already exists
        result = await session.execute(select(User).limit(1))
        if result.scalar_one_or_none() is not None:
            print("Database already seeded. Skipping.")
            return

        # ── Users ────────────────────────────────────────────────
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            password_hash=hash_password("admin123"),
            name="Admin User",
            role="admin",
        )
        shop_owner = User(
            id=uuid.uuid4(),
            email="owner@techstore.com",
            password_hash=hash_password("owner123"),
            name="Sarah Chen",
            role="shop_admin",
        )
        shop_owner_2 = User(
            id=uuid.uuid4(),
            email="owner@fashionhub.com",
            password_hash=hash_password("owner123"),
            name="Marcus Johnson",
            role="shop_admin",
        )
        regular_user = User(
            id=uuid.uuid4(),
            email="user@example.com",
            password_hash=hash_password("user123"),
            name="Alex Rivera",
            role="user",
        )
        session.add_all([admin_user, shop_owner, shop_owner_2, regular_user])

        # ── Categories ───────────────────────────────────────────
        electronics = Category(id=uuid.uuid4(), name="Electronics", slug="electronics")
        laptops = Category(
            id=uuid.uuid4(),
            name="Laptops",
            slug="laptops",
            parent_id=electronics.id,
        )
        phones = Category(
            id=uuid.uuid4(),
            name="Smartphones",
            slug="smartphones",
            parent_id=electronics.id,
        )
        fashion = Category(id=uuid.uuid4(), name="Fashion", slug="fashion")
        mens = Category(
            id=uuid.uuid4(), name="Men's Clothing", slug="mens-clothing", parent_id=fashion.id
        )
        womens = Category(
            id=uuid.uuid4(), name="Women's Clothing", slug="womens-clothing", parent_id=fashion.id
        )
        home = Category(id=uuid.uuid4(), name="Home & Garden", slug="home-garden")

        session.add_all([electronics, laptops, phones, fashion, mens, womens, home])

        # ── Shops ────────────────────────────────────────────────
        tech_store = Shop(
            id=uuid.uuid4(),
            owner_id=shop_owner.id,
            name="TechStore Pro",
            description="Your one-stop shop for the latest electronics and gadgets.",
            website="https://techstorepro.example.com",
        )
        fashion_hub = Shop(
            id=uuid.uuid4(),
            owner_id=shop_owner_2.id,
            name="Fashion Hub",
            description="Trendy fashion for everyone. Quality clothes at great prices.",
            website="https://fashionhub.example.com",
        )
        session.add_all([tech_store, fashion_hub])

        # ── Products ─────────────────────────────────────────────
        products = [
            Product(
                shop_id=tech_store.id,
                category_id=laptops.id,
                name="ProBook X1 Laptop",
                description="Powerful 16\" laptop with M3 chip, 16GB RAM, and 512GB SSD. Perfect for developers and creatives.",
                price=1299.99,
                original_price=1499.99,
                attributes={"cpu": "M3", "ram": "16GB", "storage": "512GB SSD", "screen": "16 inch"},
            ),
            Product(
                shop_id=tech_store.id,
                category_id=laptops.id,
                name="AirLight 14 Laptop",
                description="Ultra-lightweight 14\" laptop. Great battery life for work on the go.",
                price=899.99,
                attributes={"cpu": "i7-13700H", "ram": "8GB", "storage": "256GB SSD", "screen": "14 inch"},
            ),
            Product(
                shop_id=tech_store.id,
                category_id=phones.id,
                name="Galaxy Ultra S25",
                description="Flagship smartphone with 200MP camera and all-day battery.",
                price=1199.99,
                original_price=1299.99,
                attributes={"camera": "200MP", "battery": "5000mAh", "storage": "256GB"},
            ),
            Product(
                shop_id=tech_store.id,
                category_id=phones.id,
                name="Pixel 10 Pro",
                description="Google's smartest phone yet. AI-powered camera and pure Android experience.",
                price=899.99,
                attributes={"camera": "50MP + AI", "battery": "4800mAh", "storage": "128GB"},
            ),
            Product(
                shop_id=fashion_hub.id,
                category_id=mens.id,
                name="Classic Fit Oxford Shirt",
                description="Timeless oxford button-down shirt. 100% cotton, wrinkle-resistant.",
                price=49.99,
                original_price=69.99,
                attributes={"material": "100% Cotton", "fit": "Classic", "sizes": "S-XXL"},
            ),
            Product(
                shop_id=fashion_hub.id,
                category_id=mens.id,
                name="Slim Chino Pants",
                description="Comfortable stretch chinos for the modern man.",
                price=59.99,
                attributes={"material": "98% Cotton, 2% Spandex", "fit": "Slim", "sizes": "28-38"},
            ),
            Product(
                shop_id=fashion_hub.id,
                category_id=womens.id,
                name="Floral Summer Dress",
                description="Light and breezy floral print dress. Perfect for warm weather.",
                price=79.99,
                original_price=99.99,
                attributes={"material": "Rayon", "fit": "A-Line", "sizes": "XS-XL"},
            ),
            Product(
                shop_id=fashion_hub.id,
                category_id=womens.id,
                name="High-Rise Skinny Jeans",
                description="Flattering high-rise jeans with the perfect amount of stretch.",
                price=69.99,
                attributes={"material": "92% Cotton, 6% Poly, 2% Spandex", "fit": "Skinny", "sizes": "24-34"},
            ),
        ]
        session.add_all(products)

        # ── Coupons ──────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        coupons = [
            Coupon(
                shop_id=tech_store.id,
                code="TECH20",
                description="20% off all electronics",
                discount_type="percentage",
                discount_value=20,
                min_purchase=100,
                valid_from=now,
                valid_until=now + timedelta(days=30),
            ),
            Coupon(
                shop_id=tech_store.id,
                code="LAPTOP50",
                description="$50 off any laptop purchase",
                discount_type="fixed",
                discount_value=50,
                min_purchase=500,
                valid_from=now,
                valid_until=now + timedelta(days=14),
            ),
            Coupon(
                shop_id=fashion_hub.id,
                code="STYLE15",
                description="15% off your first fashion order",
                discount_type="percentage",
                discount_value=15,
                valid_from=now,
                valid_until=now + timedelta(days=60),
            ),
            Coupon(
                shop_id=fashion_hub.id,
                code="SUMMER25",
                description="$25 off summer collection",
                discount_type="fixed",
                discount_value=25,
                min_purchase=75,
                valid_from=now,
                valid_until=now + timedelta(days=45),
            ),
        ]
        session.add_all(coupons)

        await session.commit()
        print("Database seeded successfully!")
        print(f"  - 4 users (admin, 2 shop owners, 1 regular)")
        print(f"  - 7 categories (3 top-level + 4 sub-categories)")
        print(f"  - 2 shops")
        print(f"  - {len(products)} products")
        print(f"  - {len(coupons)} coupons")


if __name__ == "__main__":
    asyncio.run(seed())
