"""
Category API routes.

== Hierarchical Data (for Next.js devs) ==

Categories form a tree: Electronics → Laptops, Smartphones, etc.
The GET /categories endpoint returns them pre-nested so the frontend
can render a sidebar tree or breadcrumbs without extra work.

Most endpoints here are admin-only (regular users just read categories).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.category import Category
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    CategoryWithChildren,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


def _build_tree(categories: list[Category], parent_id: uuid.UUID | None = None) -> list[dict]:
    """
    Recursively build a nested tree from a flat list of categories.

    This is a common algorithm for hierarchical data:
    1. Find all categories whose parent_id matches
    2. For each, recursively find its children
    3. Return the nested structure
    """
    tree = []
    for cat in categories:
        if cat.parent_id == parent_id:
            children = _build_tree(categories, cat.id)
            tree.append({
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "parent_id": cat.parent_id,
                "children": children,
            })
    return tree


@router.get("", response_model=list[CategoryWithChildren])
async def list_categories(
    flat: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    List all categories. By default returns a nested tree structure.
    Pass ?flat=true to get a flat list instead.
    """
    result = await db.execute(select(Category).order_by(Category.name))
    categories = list(result.scalars().all())

    if flat:
        return categories

    return _build_tree(categories)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Create a new category (admin only)."""
    # Verify parent exists if provided
    if data.parent_id:
        parent = await db.execute(select(Category).where(Category.id == data.parent_id))
        if parent.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Parent category not found")

    category = Category(**data.model_dump())
    db.add(category)
    await db.flush()
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Update a category (admin only)."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    # Only update fields that were explicitly sent
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.flush()
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Delete a category (admin only). Fails if products still reference it."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.delete(category)
    await db.flush()
