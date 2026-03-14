"""
FastAPI dependencies — reusable "middleware-like" functions.

== Dependency Injection (for Next.js devs) ==

In Next.js, you'd protect a route like this:
    export default async function handler(req, res) {
      const session = await getServerSession(req, res, authOptions)
      if (!session) return res.status(401).json({ error: "Unauthorized" })
      // ... rest of handler
    }

In FastAPI, you use "dependencies" — functions that run BEFORE your route
handler. FastAPI automatically calls them and passes the result:

    @router.get("/me")
    async def get_me(user: User = Depends(get_current_user)):
        return user  # ← `user` is already validated!

The `Depends(get_current_user)` tells FastAPI:
    1. Call `get_current_user()` before this route
    2. Pass its return value as the `user` parameter
    3. If it raises an exception, the route never runs

This is like middleware, but more granular — you can apply it per-route
instead of globally.

== Cookie-based Tokens ==

We store JWT tokens in httpOnly cookies (not localStorage) because:
    - httpOnly cookies can't be read by JavaScript (XSS-proof)
    - They're sent automatically on every request (no manual headers)
    - Same-site cookies prevent CSRF attacks

In Next.js, you'd use `cookies()` from `next/headers`. In FastAPI,
we read them from `request.cookies`.
"""

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.services.auth_service import is_token_blacklisted


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate the JWT from the request cookie.
    Returns the authenticated User or raises 401.

    This is your "auth guard" — any route that depends on this
    function is automatically protected.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )

    # Read the access token from the httpOnly cookie
    token = request.cookies.get("access_token")
    if token is None:
        raise credentials_exception

    # Check if token was revoked (user logged out)
    if await is_token_blacklisted(token):
        raise credentials_exception

    # Decode and validate the JWT
    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Look up the user in the database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Like get_current_user but also checks for admin role.

    == Dependency Chaining ==

    Notice how this depends on `get_current_user`? FastAPI handles
    the chain automatically:

        get_current_admin → calls get_current_user → reads cookie → queries DB

    You just declare what you need, FastAPI figures out the order.
    Like React hooks calling other hooks.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
