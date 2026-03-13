"""create_initial_tables

Revision ID: 12b827b4c094
Revises:
Create Date: 2026-03-14 04:43:27.439317

== Alembic Migrations (for Next.js / Prisma devs) ==

In Prisma, you run `prisma migrate dev` and it auto-generates SQL from
your schema changes. Alembic works similarly but gives you more control.

Each migration file has two functions:
  - upgrade()   → runs when you apply the migration (like `prisma migrate deploy`)
  - downgrade() → runs when you UNDO the migration (Prisma doesn't have this!)

The downgrade() is powerful: if a migration breaks production, you can
roll back to the previous version. Always write both.

Key Alembic operations:
  - op.create_table(...)   → CREATE TABLE
  - op.drop_table(...)     → DROP TABLE
  - op.add_column(...)     → ALTER TABLE ADD COLUMN
  - op.create_index(...)   → CREATE INDEX (speeds up queries on that column)

The `sa.` prefix is SQLAlchemy's column type system.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = "12b827b4c094"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all initial tables."""

    # ── Users ────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("oauth_provider", sa.String(50), nullable=True),
        sa.Column("oauth_id", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ── Categories (before products, because products FK → categories) ──
    op.create_table(
        "categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column(
            "parent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("categories.id"),
            nullable=True,
        ),
    )

    # ── Shops ────────────────────────────────────────────────────
    op.create_table(
        "shops",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ── Products ─────────────────────────────────────────────────
    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "shop_id",
            UUID(as_uuid=True),
            sa.ForeignKey("shops.id"),
            nullable=False,
        ),
        sa.Column(
            "category_id",
            UUID(as_uuid=True),
            sa.ForeignKey("categories.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("original_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("attributes", JSONB, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ── Coupons ──────────────────────────────────────────────────
    op.create_table(
        "coupons",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "shop_id",
            UUID(as_uuid=True),
            sa.ForeignKey("shops.id"),
            nullable=False,
        ),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("discount_type", sa.String(20), nullable=False),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("min_purchase", sa.Numeric(10, 2), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
    )

    # ── Chat Sessions ────────────────────────────────────────────
    op.create_table(
        "chat_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ── Chat Messages ────────────────────────────────────────────
    op.create_table(
        "chat_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            UUID(as_uuid=True),
            sa.ForeignKey("chat_sessions.id"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    """Drop all tables in reverse order (respecting foreign key deps)."""
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("coupons")
    op.drop_table("products")
    op.drop_table("shops")
    op.drop_table("categories")
    op.drop_table("users")
