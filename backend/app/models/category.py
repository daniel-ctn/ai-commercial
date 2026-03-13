"""
Category model — maps to the `categories` table.

== Self-Referential Relationships ==

Categories can have sub-categories (like folders inside folders).
This is called a "self-referential" or "recursive" relationship:

    parent_id → categories.id   (points back to the SAME table)

In Prisma you'd write:
    model Category {
      parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
      children Category[] @relation("SubCategories")
    }

In SQLAlchemy, we use `remote_side` to tell it which side is the "parent":
    children = relationship("Category", back_populates="parent")
    parent   = relationship("Category", back_populates="children", remote_side=[id])
"""

import uuid

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # URL-friendly name: "Electronics" → "electronics"
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # Self-referential FK — nullable because top-level categories have no parent
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True
    )

    # ── Relationships ────────────────────────────────────────────
    # `remote_side=[id]` tells SQLAlchemy: "the OTHER side of this
    # relationship is identified by the `id` column" — needed for
    # self-referential relationships.
    parent: Mapped["Category | None"] = relationship(
        back_populates="children",
        remote_side="Category.id",
    )
    children: Mapped[list["Category"]] = relationship(
        back_populates="parent",
    )

    products: Mapped[list["Product"]] = relationship(  # noqa: F821
        back_populates="category",
    )

    def __repr__(self) -> str:
        return f"<Category {self.name}>"
