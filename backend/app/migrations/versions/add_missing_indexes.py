"""add_missing_indexes

Revision ID: a3f1c2d4e567
Revises: 12b827b4c094
Create Date: 2026-03-17

Adds indexes on foreign key columns and frequently filtered columns
to prevent full table scans on common queries.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "a3f1c2d4e567"
down_revision: Union[str, Sequence[str], None] = "12b827b4c094"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_shops_owner_id", "shops", ["owner_id"])
    op.create_index("ix_shops_is_active", "shops", ["is_active"])

    op.create_index("ix_products_shop_id", "products", ["shop_id"])
    op.create_index("ix_products_category_id", "products", ["category_id"])
    op.create_index("ix_products_is_active", "products", ["is_active"])
    op.create_index(
        "ix_products_active_category",
        "products",
        ["is_active", "category_id"],
    )

    op.create_index("ix_coupons_shop_id", "coupons", ["shop_id"])
    op.create_index("ix_coupons_is_active", "coupons", ["is_active"])
    op.create_index("ix_coupons_valid_until", "coupons", ["valid_until"])

    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])

    op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_session_id")
    op.drop_index("ix_chat_sessions_user_id")
    op.drop_index("ix_categories_parent_id")
    op.drop_index("ix_coupons_valid_until")
    op.drop_index("ix_coupons_is_active")
    op.drop_index("ix_coupons_shop_id")
    op.drop_index("ix_products_active_category")
    op.drop_index("ix_products_is_active")
    op.drop_index("ix_products_category_id")
    op.drop_index("ix_products_shop_id")
    op.drop_index("ix_shops_is_active")
    op.drop_index("ix_shops_owner_id")
