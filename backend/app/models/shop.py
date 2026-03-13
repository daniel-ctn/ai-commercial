"""
Shop model — maps to the `shops` table.

== Foreign Keys (for Next.js devs) ==

In Prisma you write:
    model Shop {
      owner   User   @relation(fields: [ownerId], references: [id])
      ownerId String
    }

In SQLAlchemy, you use `ForeignKey`:
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

The string "users.id" refers to the `users` TABLE (not the User class)
and its `id` column. SQLAlchemy figures out the rest.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Foreign key → users table
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────
    owner: Mapped["User"] = relationship(back_populates="shops")  # noqa: F821

    products: Mapped[list["Product"]] = relationship(  # noqa: F821
        back_populates="shop",
        cascade="all, delete-orphan",
    )
    coupons: Mapped[list["Coupon"]] = relationship(  # noqa: F821
        back_populates="shop",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Shop {self.name}>"
