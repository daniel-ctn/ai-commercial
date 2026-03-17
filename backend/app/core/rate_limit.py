"""
Rate limiting middleware using Upstash Redis.

== Rate Limiting (for Next.js devs) ==

In Next.js, you might use Vercel's built-in rate limiting or a library
like `@upstash/ratelimit`. This is the Python equivalent.

Rate limiting prevents abuse:
  - Brute-force login attempts (try 1000 passwords)
  - API spam (scraping all products)
  - DDoS (overwhelming the server)

We use a "sliding window" approach:
  - Each IP gets N requests per window (e.g., 20 requests per minute)
  - Redis tracks the count with auto-expiring keys
  - If exceeded, return 429 Too Many Requests

== FastAPI Middleware ==

Middleware runs on EVERY request, before the route handler:
    Request → Middleware → Route Handler → Middleware → Response

Like Express middleware: app.use((req, res, next) => { ... })
"""

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import settings
from app.core.redis import redis_client

SKIP_PATHS = frozenset({
    "/health",
    "/health/ready",
    "/openapi.json",
    f"{settings.api_prefix}/docs",
    f"{settings.api_prefix}/redoc",
})


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_window: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        client_ip = _get_client_ip(request)

        if "/auth/login" in request.url.path or "/auth/register" in request.url.path:
            key = f"rate_limit:auth:{client_ip}"
            max_requests = 10
        else:
            key = f"rate_limit:{client_ip}"
            max_requests = self.requests_per_window

        current = 0
        try:
            current = await redis_client.incr(key)

            if current == 1:
                await redis_client.expire(key, self.window_seconds)

            if current > max_requests:
                return Response(
                    content='{"detail":"Too many requests. Please try again later."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json",
                )
        except Exception:
            pass

        response = await call_next(request)

        remaining = max(0, max_requests - current)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
