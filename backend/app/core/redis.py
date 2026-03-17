from upstash_redis.asyncio import Redis

from app.core.config import settings


def get_redis() -> Redis:
    """
    Create an async Upstash Redis client.

    Unlike traditional Redis (which uses persistent TCP connections),
    Upstash Redis communicates over HTTP/REST. This means:
    - No connection pool management needed
    - Works in serverless environments
    - Each call is an independent HTTP request

    Uses the async client to avoid blocking the FastAPI event loop.
    """
    return Redis(
        url=settings.upstash_redis_url,
        token=settings.upstash_redis_token,
    )


redis_client = get_redis()
