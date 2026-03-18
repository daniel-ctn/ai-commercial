"""Add search_vector to products

Revision ID: b4g2d3e5f678
Revises: a3f1c2d4e567
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b4g2d3e5f678'
down_revision: Union[str, Sequence[str], None] = 'a3f1c2d4e567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add generated column for tsvector
    # We use raw SQL because alembic's support for generated columns can be tricky
    op.execute(
        """
        ALTER TABLE products
        ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'B')
        ) STORED;
        """
    )
    
    # Create GIN index
    op.create_index(
        'idx_product_search_vector', 
        'products', 
        ['search_vector'], 
        unique=False, 
        postgresql_using='gin'
    )


def downgrade() -> None:
    op.drop_index('idx_product_search_vector', table_name='products', postgresql_using='gin')
    op.drop_column('products', 'search_vector')
