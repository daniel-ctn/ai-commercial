import re
import time
from collections import defaultdict
from dataclasses import dataclass, field

UUID_RE = re.compile(r"/[0-9a-f-]{36}", re.IGNORECASE)

_started_at = time.time()


@dataclass
class _LatencyBucket:
    count: int = 0
    total_ms: float = 0.0
    max_ms: float = 0.0


class MetricsCollector:
    def __init__(self):
        self._latency: dict[str, _LatencyBucket] = defaultdict(_LatencyBucket)
        self._chat_latency: dict[str, _LatencyBucket] = defaultdict(_LatencyBucket)
        self._counters: dict[str, int] = defaultdict(int)

    def record_latency(self, route: str, ms: float):
        key = UUID_RE.sub("/:id", route)
        bucket = self._latency[key]
        bucket.count += 1
        bucket.total_ms += ms
        if ms > bucket.max_ms:
            bucket.max_ms = ms

    def record_chat_latency(self, route: str, ms: float):
        key = UUID_RE.sub("/:id", route)
        bucket = self._chat_latency[key]
        bucket.count += 1
        bucket.total_ms += ms
        if ms > bucket.max_ms:
            bucket.max_ms = ms

    def increment(self, counter: str):
        self._counters[counter] += 1

    def snapshot(self) -> dict:
        latency = {}
        for route, b in self._latency.items():
            latency[route] = {
                "count": b.count,
                "avg_ms": round(b.total_ms / b.count) if b.count else 0,
                "max_ms": round(b.max_ms),
            }
        chat_latency = {}
        for route, b in self._chat_latency.items():
            chat_latency[route] = {
                "count": b.count,
                "avg_ms": round(b.total_ms / b.count) if b.count else 0,
                "max_ms": round(b.max_ms),
            }
        return {
            "uptime_seconds": round(time.time() - _started_at),
            "api_latency": latency,
            "chat_latency": chat_latency,
            "counters": dict(self._counters),
        }


metrics = MetricsCollector()
