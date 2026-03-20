import logging
import time
import uuid as uuid_mod
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from app.core.config import settings
from app.core.error_tracker import error_tracker
from app.core.metrics import metrics as app_metrics
from app.core.rate_limit import RateLimitMiddleware

logger = logging.getLogger("app")
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s...", settings.app_name)
    logger.info("Environment: debug=%s", settings.debug)
    logger.info(
        "Features: google_oauth=%s, ai_chat=%s",
        bool(settings.google_client_id),
        bool(settings.gemini_api_key),
    )
    logger.info("Frontend URL: %s", settings.frontend_url)
    logger.info("Health: /health/ready | Metrics: /health/metrics")
    yield
    logger.info("Shutting down %s...", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url=f"{settings.api_prefix}/docs" if settings.debug else None,
    redoc_url=f"{settings.api_prefix}/redoc" if settings.debug else None,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception("Unhandled error [%s] %s %s", request_id, request.method, request.url.path)
    error_tracker.capture(
        method=request.method,
        url=str(request.url.path),
        status=500,
        exc=exc,
        request_id=request_id,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "request_id": request_id},
        headers={"X-Request-ID": request_id},
    )


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    incoming = request.headers.get("x-request-id")
    request_id = incoming if incoming else str(uuid_mod.uuid4())[:8]
    request.state.request_id = request_id
    start = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start) * 1000
    route = f"{request.method} {request.url.path}"
    app_metrics.record_latency(route, elapsed_ms)

    if response.status_code in (401, 403):
        app_metrics.increment("auth_failures")

    log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
    logger.log(
        log_level,
        "%s %s %s %.0fms [%s]",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    response.headers["X-Request-ID"] = request_id
    return response

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
from app.api.admin import router as admin_router
from app.api.chat import router as chat_router
from app.api.compare import router as compare_router
from app.api.favorites import router as favorites_router
from app.api.shop_admin import router as shop_admin_router
from app.api.cart import router as cart_router
from app.api.orders import router as orders_router
from app.api.webhooks import router as webhooks_router

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(categories_router, prefix=settings.api_prefix)
app.include_router(shops_router, prefix=settings.api_prefix)
app.include_router(products_router, prefix=settings.api_prefix)
app.include_router(coupons_router, prefix=settings.api_prefix)
app.include_router(compare_router, prefix=settings.api_prefix)
app.include_router(favorites_router, prefix=settings.api_prefix)
app.include_router(shop_admin_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(chat_router, prefix=settings.api_prefix)
app.include_router(cart_router, prefix=settings.api_prefix)
app.include_router(orders_router, prefix=settings.api_prefix)
app.include_router(webhooks_router)


@app.get("/sitemap.xml", response_class=Response)
async def sitemap(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select as sel
    from app.models.product import Product as Prod
    from app.models.shop import Shop as Shp

    products = (await db.execute(
        sel(Prod.id, Prod.created_at).where(Prod.is_active == True)
        .order_by(Prod.created_at.desc()).limit(5000)
    )).all()
    shops = (await db.execute(
        sel(Shp.id, Shp.created_at).where(Shp.is_active == True)
        .order_by(Shp.created_at.desc())
    )).all()

    base = settings.frontend_url
    static_pages = [
        (f"{base}/", "1.0", "daily"),
        (f"{base}/products", "0.9", "daily"),
        (f"{base}/shops", "0.8", "weekly"),
        (f"{base}/deals", "0.8", "daily"),
        (f"{base}/compare", "0.6", "weekly"),
        (f"{base}/about", "0.4", "monthly"),
    ]

    urls = []
    for loc, pri, freq in static_pages:
        urls.append(f"  <url><loc>{loc}</loc><changefreq>{freq}</changefreq><priority>{pri}</priority></url>")
    for p in products:
        lm = p.created_at.strftime("%Y-%m-%d")
        urls.append(f"  <url><loc>{base}/products/{p.id}</loc><lastmod>{lm}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>")
    for s in shops:
        lm = s.created_at.strftime("%Y-%m-%d")
        urls.append(f"  <url><loc>{base}/shops/{s.id}</loc><lastmod>{lm}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>")

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>"
    return Response(content=xml, media_type="application/xml")


_started_at = time.time()


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.app_name,
        "backend": "fastapi",
        "uptime_seconds": round(time.time() - _started_at),
    }


@app.get("/health/ready")
async def readiness_check():
    """Deep health check — verifies DB, Redis, and AI provider status."""
    from app.core.database import engine
    from app.core.redis import redis_client
    from sqlalchemy import text

    checks = {}

    db_start = time.perf_counter()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = {"status": "ok", "latency_ms": round((time.perf_counter() - db_start) * 1000)}
    except Exception as e:
        checks["database"] = {"status": f"error: {e}", "latency_ms": round((time.perf_counter() - db_start) * 1000)}

    redis_start = time.perf_counter()
    try:
        await redis_client.set("health_check", "1", ex=10)
        checks["redis"] = {"status": "ok", "latency_ms": round((time.perf_counter() - redis_start) * 1000)}
    except Exception as e:
        checks["redis"] = {"status": f"error: {e}", "latency_ms": round((time.perf_counter() - redis_start) * 1000)}

    checks["ai_provider"] = {
        "status": "configured" if settings.gemini_api_key else "not_configured",
        "provider": "google_gemini",
    }

    all_ok = all(
        v.get("status") in ("ok", "configured") if isinstance(v, dict) else v == "ok"
        for v in checks.values()
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ok" if all_ok else "degraded",
            "checks": checks,
            "features": _get_features(),
        },
    )


@app.get("/health/features")
async def get_features():
    return _get_features()


@app.get("/health/metrics")
async def get_metrics():
    return app_metrics.snapshot()


@app.get("/health/errors")
async def get_errors(limit: int = 20):
    normalized_limit = max(1, min(limit, 100))
    return {
        "total": error_tracker.count(),
        "errors": error_tracker.get_recent(
            normalized_limit,
            include_sensitive=settings.debug,
        ),
    }


def _get_features() -> dict:
    return {
        "auth": True,
        "google_oauth": bool(settings.google_client_id),
        "chat": bool(settings.gemini_api_key),
        "products": True,
        "shops": True,
        "coupons": True,
        "compare": True,
        "admin": True,
        "full_text_search": True,
    }
