"""Category Pydantic schemas."""

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    parent_id: uuid.UUID | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError("Slug must contain only lowercase letters, numbers, and hyphens")
        return v


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    parent_id: uuid.UUID | None = None

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):
            raise ValueError("Slug must contain only lowercase letters, numbers, and hyphens")
        return v


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    parent_id: uuid.UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class CategoryWithChildren(CategoryResponse):
    """Category with nested children — used for hierarchical listings."""
    children: list["CategoryWithChildren"] = []
