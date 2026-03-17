"""
Auth service — business logic for authentication.

== Service Layer Pattern ==

In Next.js, you might put auth logic directly in your API route handlers
(app/api/auth/route.ts). In Python/FastAPI, we separate:

  1. **Routes** (api/auth.py)    → HTTP concerns (request/response, status codes)
  2. **Services** (this file)    → Business logic (register, login, validate)
  3. **Models** (models/user.py) → Database structure

This keeps each layer focused on one thing. The route doesn't know about
SQL, and the service doesn't know about HTTP status codes.

== Why separate? ==

Imagine you want to create a user from both:
  - POST /register (HTTP API)
  - A CLI admin command
  - An OAuth callback

With the logic in a service, all three can call `auth_service.register_user()`
without duplicating code.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.redis import redis_client
from app.models.user import User
from app.schemas.user import UserCreate


async def register_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Register a new user with email + password.

    Steps:
    1. Check if email is already taken
    2. Hash the password (never store plain text!)
    3. Create and save the user
    """
    # Check for existing user
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none() is not None:
        raise ValueError("Email already registered")

    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
    )
    db.add(user)
    await db.flush()  # Assigns the UUID without committing (commit happens in get_db)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    """
    Verify email + password. Returns the user if valid, None if not.

    This is like NextAuth's `authorize` callback in CredentialsProvider.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        return None
    if not verify_password(password, user.password_hash):
        return None

    return user


def create_tokens(user: User) -> dict[str, str]:
    """
    Create both access and refresh JWT tokens for a user.

    The `sub` (subject) claim is a JWT standard — it identifies
    WHO the token belongs to. We use the user's UUID.
    """
    token_data = {"sub": str(user.id)}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
    }


async def blacklist_token(token: str, expires_in_seconds: int) -> None:
    """
    Add a token to the Redis blacklist (for logout).

    == Token Blacklisting ==

    JWTs are stateless — once issued, they're valid until they expire.
    So how do you "log out" a user? You can't un-sign a JWT.

    The solution: maintain a "blacklist" of revoked tokens in Redis.
    On every request, check if the token is blacklisted before allowing access.

    Redis is perfect for this because:
    1. It's fast (in-memory)
    2. It supports TTL (auto-delete) — set the same expiry as the token
       so the blacklist doesn't grow forever

    In Next.js with NextAuth, sessions are server-side so you just delete
    them. JWTs need this extra step.
    """
    await redis_client.set(f"blacklist:{token}", "1", ex=expires_in_seconds)


async def is_token_blacklisted(token: str) -> bool:
    """Check if a token has been revoked (user logged out)."""
    result = await redis_client.get(f"blacklist:{token}")
    return result is not None


async def get_or_create_oauth_user(
    db: AsyncSession,
    email: str,
    name: str,
    provider: str,
    oauth_id: str,
) -> User:
    """
    Find or create a user from OAuth (Google) login.

    == OAuth Flow ==

    When a user clicks "Sign in with Google":
    1. Frontend redirects to Google's consent screen
    2. Google redirects back with an authorization `code`
    3. Backend exchanges the code for Google user info (email, name)
    4. We either find an existing user with that email OR create a new one

    This function handles step 4. Note: OAuth users have NO password_hash
    because they authenticate through Google, not our password system.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is not None:
        if user.oauth_provider == provider and user.oauth_id == oauth_id:
            return user

        if user.oauth_provider and user.oauth_provider != provider:
            raise ValueError("This email is already linked to a different OAuth provider")

        if not user.oauth_provider and user.password_hash:
            raise ValueError(
                "An account with this email already exists. Please log in with your password."
            )

        return user

    # Create new OAuth user (no password)
    user = User(
        email=email,
        name=name,
        oauth_provider=provider,
        oauth_id=oauth_id,
    )
    db.add(user)
    await db.flush()
    return user
