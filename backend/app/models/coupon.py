"""
Coupon model — maps to the `coupons` table.

== DateTime Ranges for Validity ==

Coupons have a `valid_from` and `valid_until` window. When querying
"active coupons", we'll filter:

    WHERE now() BETWEEN valid_from AND valid_until AND is_active = true

This is a common pattern for time-limited content (sales, events,
subscriptions, etc.).
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    shop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shops.id"), nullable=False
    )

    # Unique coupon code like "SAVE20", "SUMMER2024"
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "percentage" → 20% off, "fixed" → $10 off
    discount_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # The discount amount (20 for 20%, or 10 for $10)
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Minimum purchase required to use the coupon (nullable = no minimum)
    min_purchase: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    valid_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    # ── Relationships ────────────────────────────────────────────
    shop: Mapped["Shop"] = relationship(back_populates="coupons")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Coupon {self.code}>"
