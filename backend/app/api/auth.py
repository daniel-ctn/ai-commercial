"""
Auth API routes — HTTP endpoints for authentication.

== APIRouter (for Next.js devs) ==

In Next.js App Router, each file in `app/api/` is a separate route:
    app/api/auth/register/route.ts  →  POST /api/auth/register
    app/api/auth/login/route.ts     →  POST /api/auth/login

In FastAPI, we group related routes using `APIRouter`:
    router = APIRouter(prefix="/auth", tags=["Auth"])

    @router.post("/register")    →  POST /api/v1/auth/register
    @router.post("/login")       →  POST /api/v1/auth/login

The `tags=["Auth"]` groups these in the auto-generated Swagger docs
(visit /api/v1/docs to see them — way better than Postman!).

== Response Cookies ==

We set tokens as httpOnly cookies in the response:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,     # ← JS can't read it (XSS protection)
        samesite="lax",    # ← Prevents CSRF
        secure=True,       # ← Only sent over HTTPS
    )

This is equivalent to NextResponse.cookies.set() in Next.js.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.services.auth_service import (
    authenticate_user,
    blacklist_token,
    create_tokens,
    get_or_create_oauth_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

# Cookie settings — shared across all set_cookie calls
COOKIE_SETTINGS = {
    "httponly": True,
    "samesite": "lax",
    "secure": not settings.debug,  # HTTPS only in production
}


def _set_auth_cookies(response: Response, tokens: dict[str, str]) -> None:
    """Set access and refresh token cookies on the response."""
    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        max_age=settings.access_token_expire_minutes * 60,
        **COOKIE_SETTINGS,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        max_age=settings.refresh_token_expire_days * 86400,
        **COOKIE_SETTINGS,
    )


def _clear_auth_cookies(response: Response) -> None:
    """Remove auth cookies (for logout)."""
    response.delete_cookie("access_token", **COOKIE_SETTINGS)
    response.delete_cookie("refresh_token", **COOKIE_SETTINGS)


# ── Register ─────────────────────────────────────────────────────


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user account and return tokens as cookies.

    == How FastAPI handles this request ==

    1. Client sends: POST /api/v1/auth/register
       Body: { "email": "...", "password": "...", "name": "..." }

    2. FastAPI auto-validates the body against UserCreate schema
       → Invalid email? Returns 422 with details (like Zod validation)

    3. `Depends(get_db)` gives us a database session

    4. We register the user, create tokens, set cookies

    5. `response_model=UserResponse` strips password_hash from output
       → Client only sees { id, email, name, role, created_at }
    """
    try:
        user = await register_user(db, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

    tokens = create_tokens(user)
    _set_auth_cookies(response, tokens)
    return user


# ── Login ─────────────────────────────────────────────────────────


@router.post("/login", response_model=UserResponse)
async def login(
    login_data: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email + password. Sets httpOnly cookie tokens."""
    user = await authenticate_user(db, login_data.email, login_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = create_tokens(user)
    _set_auth_cookies(response, tokens)
    return user


# ── Logout ────────────────────────────────────────────────────────


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response):
    """
    Log out by blacklisting current tokens and clearing cookies.

    Returns 204 No Content (empty body) — the standard for
    "action succeeded, nothing to return".
    """
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")

    # Blacklist both tokens so they can't be reused
    if access_token:
        await blacklist_token(access_token, settings.access_token_expire_minutes * 60)
    if refresh_token:
        await blacklist_token(refresh_token, settings.refresh_token_expire_days * 86400)

    _clear_auth_cookies(response)


# ── Refresh Token ─────────────────────────────────────────────────


@router.post("/refresh", response_model=UserResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Get new tokens using a valid refresh token.

    == Why refresh tokens? ==

    Access tokens expire quickly (30 min) for security. But you don't
    want users to re-login every 30 minutes.

    Refresh tokens live longer (7 days) and can only be used to get
    NEW access tokens. If an access token is stolen, the attacker
    only has 30 minutes. The refresh token stays in httpOnly cookies
    and is harder to steal.

    Flow:
    1. Access token expires → API returns 401
    2. Frontend calls POST /refresh (refresh token sent in cookie)
    3. Backend validates refresh token, issues new access + refresh tokens
    4. Frontend retries the original request
    """
    token = request.cookies.get("refresh_token")
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token",
        )

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    from sqlalchemy import select

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Blacklist the old refresh token (one-time use)
    await blacklist_token(token, settings.refresh_token_expire_days * 86400)

    # Issue fresh tokens
    tokens = create_tokens(user)
    _set_auth_cookies(response, tokens)
    return user


# ── Get Current User ──────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.

    Notice how clean this is — all the token validation happens in
    the `get_current_user` dependency. This handler just returns data.
    """
    return current_user


# ── Google OAuth ──────────────────────────────────────────────────


@router.get("/google")
async def google_login():
    """
    Redirect the user to Google's OAuth consent screen.

    == OAuth 2.0 Authorization Code Flow ==

    1. User clicks "Sign in with Google" → frontend calls this endpoint
    2. We redirect to Google with our client_id and redirect_uri
    3. User signs in on Google and grants permission
    4. Google redirects back to our /auth/google/callback with a `code`
    5. We exchange the code for the user's Google profile info
    """
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.google_client_id}"
        f"&redirect_uri={settings.frontend_url}/auth/google/callback"
        "&response_type=code"
        "&scope=openid email profile"
        "&access_type=offline"
    )
    return {"url": google_auth_url}


@router.post("/google/callback")
async def google_callback(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange Google's authorization code for user info and create/login the user.

    The frontend sends us the `code` it received from Google's redirect.
    We exchange it server-side (so the client_secret stays secret).
    """
    body = await request.json()
    code = body.get("code")

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code required",
        )

    import httpx

    # Exchange the code for tokens from Google
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": f"{settings.frontend_url}/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange Google auth code",
            )

        google_tokens = token_response.json()

        # Use the access token to get the user's Google profile
        user_info_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_tokens['access_token']}"},
        )

        if user_info_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch Google user info",
            )

        google_user = user_info_response.json()

    # Create or find the user in our database
    user = await get_or_create_oauth_user(
        db,
        email=google_user["email"],
        name=google_user.get("name", google_user["email"]),
        provider="google",
        oauth_id=google_user["id"],
    )

    tokens = create_tokens(user)
    _set_auth_cookies(response, tokens)
    return UserResponse.model_validate(user)
