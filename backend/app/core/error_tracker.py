import traceback
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class TrackedError:
    timestamp: str
    method: str
    url: str
    status: int
    message: str
    stack: str | None = None
    request_id: str | None = None


MAX_ERRORS = 100


class ErrorTracker:
    def __init__(self):
        self._errors: deque[TrackedError] = deque(maxlen=MAX_ERRORS)

    def capture(
        self,
        *,
        method: str,
        url: str,
        status: int,
        exc: Exception,
        request_id: str | None = None,
    ):
        self._errors.append(
            TrackedError(
                timestamp=datetime.now(timezone.utc).isoformat(),
                method=method,
                url=url,
                status=status,
                message=str(exc),
                stack="".join(traceback.format_exception(exc)),
                request_id=request_id,
            )
        )

    def get_recent(self, limit: int = 20, include_sensitive: bool = False) -> list[dict]:
        items = list(self._errors)[-limit:]
        items.reverse()
        return [
            {
                "timestamp": e.timestamp,
                "method": e.method,
                "url": e.url,
                "status": e.status,
                "request_id": e.request_id,
                **({"message": e.message, "stack": e.stack} if include_sensitive else {}),
            }
            for e in items
        ]

    def count(self) -> int:
        return len(self._errors)


error_tracker = ErrorTracker()
