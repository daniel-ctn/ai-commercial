"""
User model — maps to the `users` table in PostgreSQL.

== SQLAlchemy ORM Crash Course (for Next.js / Prisma devs) ==

In Prisma you'd write a schema file:
    model User {
      id    String @id @default(uuid())
      email String @unique
    }

In SQLAlchemy, you write a Python class instead. Each class attribute
becomes a database column:

    class User(Base):
        __tablename__ = "users"           # ← table name in Postgres
        id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
        email: Mapped[str] = mapped_column(unique=True)

Key concepts:
  • `Mapped[type]` — a type annotation that tells SQLAlchemy the Python
    type AND the SQL type (str → VARCHAR, uuid.UUID → UUID, etc.).
  • `mapped_column(...)` — like Prisma's @id, @unique, @default, etc.
  • `relationship(...)` — like Prisma's relation fields. They don't create
    DB columns; they let you do `user.shops` to load related rows.
  • `back_populates` — links two sides of a relationship so both stay in
    sync (like Prisma's implicit two-way relations).
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    # Primary key — auto-generated UUID (like @default(uuid()) in Prisma)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )

    # Nullable because OAuth users won't have a password
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # `server_default` runs the default in PostgreSQL itself (not Python).
    # This matters when you insert rows directly in SQL or via migrations.
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="user"
    )

    # OAuth fields — nullable for email/password users
    oauth_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────────
    # These don't create columns. They let you do `user.shops` in Python
    # to load related Shop rows (like Prisma's `include: { shops: true }`).
    shops: Mapped[list["Shop"]] = relationship(  # noqa: F821
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(  # noqa: F821
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """Developer-friendly string shown in logs / debugger."""
        return f"<User {self.email}>"
