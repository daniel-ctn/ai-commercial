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

from app.core.redis import redis_client


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple sliding-window rate limiter.

    Args:
        app: The FastAPI app instance
        requests_per_window: Max requests allowed per window
        window_seconds: Window duration in seconds
    """

    def __init__(self, app, requests_per_window: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for health checks and docs
        if request.url.path in ("/health", f"/api/v1/docs", f"/api/v1/redoc", "/openapi.json"):
            return await call_next(request)

        # Identify the client by IP address
        client_ip = request.client.host if request.client else "unknown"

        # Stricter limits for auth endpoints (prevent brute force)
        if "/auth/login" in request.url.path or "/auth/register" in request.url.path:
            key = f"rate_limit:auth:{client_ip}"
            max_requests = 10  # 10 auth attempts per minute
        else:
            key = f"rate_limit:{client_ip}"
            max_requests = self.requests_per_window

        try:
            # Increment the counter for this IP
            # INCR atomically increments and returns the new value
            current = redis_client.incr(key)

            # If this is the first request in the window, set the expiry
            if current == 1:
                redis_client.expire(key, self.window_seconds)

            if current > max_requests:
                return Response(
                    content='{"detail":"Too many requests. Please try again later."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json",
                )
        except Exception:
            # If Redis is down, don't block requests — fail open
            # (better to serve users than to deny everyone)
            pass

        response = await call_next(request)

        # Add rate limit headers so the frontend knows the limits
        try:
            remaining = max(0, max_requests - (current if 'current' in dir() else 0))
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
        except Exception:
            pass

        return response
