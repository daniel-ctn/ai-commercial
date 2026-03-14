"""
Shared schemas used across multiple endpoints.

== Generic Pagination (for Next.js devs) ==

In Next.js, you'd typically return an array and use query params for
page/limit. Here we wrap paginated results in a standard envelope:

    {
      "items": [...],       ← the actual data
      "total": 42,          ← total items matching the filter
      "page": 1,            ← current page number
      "page_size": 20,      ← items per page
      "pages": 3            ← total number of pages
    }

This way the frontend always knows how to render pagination controls
without guessing. The `Generic[T]` makes this reusable for ANY model.

== Python Generics ==

`PaginatedResponse[ProductResponse]` is like TypeScript's
`PaginatedResponse<ProductResponse>` — same concept, different syntax.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int
