from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,
    pool_size=5,
    max_overflow=10,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.

    In JS ORMs (Prisma/Drizzle), you define schemas in config files.
    In SQLAlchemy, you define models as Python classes that inherit from this Base.
    Each class becomes a database table.
    """


async def get_db() -> AsyncGenerator[AsyncSession]:
    """
    Dependency that provides a database session per request.

    This is a FastAPI "dependency injection" pattern:
    - FastAPI calls this function for each request that needs a DB session
    - `yield` gives the session to the route handler
    - After the route handler finishes, code after `yield` runs (cleanup)

    Similar to a try/finally pattern in JS, ensuring the connection
    is always returned to the pool.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
