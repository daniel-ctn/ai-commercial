"""
Chat API routes — AI chatbot with Server-Sent Events streaming.

== SSE Streaming (for Next.js devs) ==

In Next.js, you might use Vercel AI SDK's `useChat` hook which handles
streaming under the hood. Here, we implement SSE manually:

  1. Frontend sends POST /chat/sessions/{id}/messages with the user message
  2. Backend saves the message, calls Gemini with the conversation history
  3. As Gemini processes (tool calls, text generation), we stream SSE events
  4. Frontend reads the stream and updates the UI in real time

SSE is a one-way stream from server → client over HTTP. The response
uses `text/event-stream` content type with events formatted as:

    event: status
    data: {"message": "Searching products..."}

    event: chunk
    data: {"text": "Here are some laptops..."}

    event: done
    data: {"text": "full response text here"}

== DB Session Lifecycle with Streaming ==

FastAPI keeps the DB session (from `get_db`) alive until the streaming
response is fully sent. So we can safely read/write the DB inside the
SSE generator. The auto-commit in `get_db` runs after streaming ends.
"""

import uuid
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.error_tracker import error_tracker
from app.core.metrics import metrics as app_metrics
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatSessionResponse
from app.services.ai_service import ChatEvent, generate_chat_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chat session for the current user."""
    session = ChatSession(user_id=current_user.id)
    db.add(session)
    await db.flush()
    return session


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user, newest first."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .options(joinedload(ChatSession.messages))
        .order_by(ChatSession.created_at.desc())
    )
    return list(result.scalars().unique().all())


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a chat session with all its messages."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .options(joinedload(ChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a chat session and all its messages."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    await db.delete(session)
    await db.flush()


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: uuid.UUID,
    data: ChatMessageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message and receive an AI response via SSE streaming.

    Returns a text/event-stream with these event types:
    - status: Progress updates (e.g., "Searching products...")
    - chunk:  Text content from the AI
    - done:   Final complete response text
    - error:  Error information
    """
    # Verify session ownership and load existing messages
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .options(joinedload(ChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Persist the user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=data.content,
    )
    db.add(user_msg)
    await db.flush()

    # Build conversation history for Gemini (existing + new user message)
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages
    ]
    history.append({"role": "user", "content": data.content})
    stream_started_at = time.perf_counter()
    request_id = getattr(request.state, "request_id", "unknown")

    async def event_stream():
        full_response = ""
        response_completed = False

        try:
            async for event in generate_chat_response(history, db):
                if event.event == "error":
                    app_metrics.increment("sse_failures")
                if event.event == "done":
                    full_response = event.data.get("text", "")
                    response_completed = True
                yield event.to_sse()

            # Persist the assistant's response after streaming completes
            if full_response:
                assistant_msg = ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=full_response,
                )
                db.add(assistant_msg)
                await db.flush()
        except Exception as exc:
            logger.exception(
                "Chat stream failed [%s] session=%s",
                request_id,
                session.id,
            )
            error_tracker.capture(
                method=request.method,
                url=str(request.url.path),
                status=500,
                exc=exc,
                request_id=request_id,
            )
            if not response_completed:
                app_metrics.increment("sse_failures")
                yield ChatEvent(
                    "error",
                    {"message": "Chat stream failed. Please try again."},
                ).to_sse()
        finally:
            app_metrics.record_chat_latency(
                "POST /chat/sessions/:id/messages",
                (time.perf_counter() - stream_started_at) * 1000,
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
