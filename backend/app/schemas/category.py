"""Category Pydantic schemas."""

import uuid

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: uuid.UUID | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    parent_id: uuid.UUID | None = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    parent_id: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)
