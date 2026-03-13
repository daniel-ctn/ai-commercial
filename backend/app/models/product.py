"""
Product model — maps to the `products` table.

== JSONB Columns ==

PostgreSQL has a `jsonb` type — it stores JSON directly in the database
and lets you query inside it (like MongoDB sub-documents).

We use it for `attributes` so different product categories can have
different fields without needing extra tables:
    - A laptop might have {"ram": "16GB", "cpu": "M3", "storage": "512GB"}
    - A shirt might have {"size": "L", "color": "blue", "material": "cotton"}

In Prisma, you'd use `Json` type. In SQLAlchemy, we use `JSONB` from
the PostgreSQL dialect.

== Numeric/Decimal for Money ==

NEVER use float for money (0.1 + 0.2 = 0.30000000000000004 in floats).
Use `Numeric(precision, scale)` instead:
    - Numeric(10, 2) = up to 99,999,999.99
    - Stored as exact decimal in Postgres
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    shop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Numeric(10,2) → exact decimal, safe for money
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    original_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Flexible key-value attributes stored as JSON in Postgres
    attributes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────
    shop: Mapped["Shop"] = relationship(back_populates="products")  # noqa: F821
    category: Mapped["Category"] = relationship(back_populates="products")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Product {self.name} — ${self.price}>"
