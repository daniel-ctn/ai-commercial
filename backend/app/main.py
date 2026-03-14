from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events - code that runs on startup and shutdown.

    In Express, you might do setup in app.listen() callback.
    In FastAPI, the `lifespan` context manager handles this:
    - Code BEFORE `yield` runs on startup
    - Code AFTER `yield` runs on shutdown
    """
    # Startup
    print(f"Starting {settings.app_name}...")
    yield
    # Shutdown
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
)

# ── Middleware ────────────────────────────────────────────────────
# Middleware runs in REVERSE order of how it's added.
# (Last added = first to run on request)
#
# Request flow: Rate Limit → CORS → Route Handler → CORS → Rate Limit

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,  # Required for cookies to work cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    RateLimitMiddleware,
    requests_per_window=60,  # 60 requests per minute per IP
    window_seconds=60,
)

# ── Routes ────────────────────────────────────────────────────────
# In Next.js, routes auto-register from the file system.
# In FastAPI, we manually include routers (like Express app.use()).

from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.shops import router as shops_router
from app.api.products import router as products_router
from app.api.coupons import router as coupons_router

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(categories_router, prefix=settings.api_prefix)
app.include_router(shops_router, prefix=settings.api_prefix)
app.include_router(products_router, prefix=settings.api_prefix)
app.include_router(coupons_router, prefix=settings.api_prefix)


@app.get("/health")
async def health_check():
    """Simple health check endpoint. Visit /health to verify the server is running."""
    return {"status": "ok", "app": settings.app_name}
