/**
 * Chat API hooks — SSE streaming for AI chatbot.
 *
 * == Why a separate file? (for Next.js devs) ==
 *
 * The chat endpoint uses Server-Sent Events (SSE) for streaming,
 * which doesn't fit the standard api.ts request/response pattern.
 * SSE needs:
 *   - fetch() with ReadableStream (not JSON response)
 *   - Manual SSE line parsing (not JSON.parse)
 *   - POST method (EventSource only supports GET)
 *
 * This file provides:
 *   - chatApi: CRUD for chat sessions (uses standard api.ts)
 *   - sendChatMessage: SSE streaming with callbacks
 *   - useChat: React hook that ties it all together
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '#/lib/api'
import type { ChatSession, ChatSSEEvent } from '#/lib/types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// ── Chat Session API ─────────────────────────────────────────────

export const chatApi = {
  createSession: () => api.post<ChatSession>('/chat/sessions'),
  listSessions: () => api.get<ChatSession[]>('/chat/sessions'),
  getSession: (id: string) => api.get<ChatSession>(`/chat/sessions/${id}`),
  deleteSession: (id: string) => api.delete(`/chat/sessions/${id}`),
}

// ── SSE Message Streaming ────────────────────────────────────────

interface StreamCallbacks {
  onStatus?: (message: string) => void
  onChunk?: (text: string) => void
  onDone?: (text: string) => void
  onError?: (message: string) => void
}

function processSseEvent(eventStr: string, callbacks: StreamCallbacks) {
  if (!eventStr.trim()) return

  let eventType = ''
  let eventData = ''

  for (const line of eventStr.split('\n')) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7)
    } else if (line.startsWith('data: ')) {
      eventData = line.slice(6)
    }
  }

  if (!eventType || !eventData) return

  try {
    const parsed = JSON.parse(eventData) as ChatSSEEvent['data']

    switch (eventType) {
      case 'status':
        callbacks.onStatus?.((parsed as { message: string }).message)
        break
      case 'chunk':
        callbacks.onChunk?.((parsed as { text: string }).text)
        break
      case 'done':
        callbacks.onDone?.((parsed as { text: string }).text)
        break
      case 'error':
        callbacks.onError?.((parsed as { message: string }).message)
        break
    }
  } catch {
    // Skip malformed SSE data
  }
}

/**
 * Send a message and consume the SSE response stream.
 *
 * Uses fetch + ReadableStream instead of EventSource because:
 * - EventSource only supports GET requests
 * - We need POST with a JSON body
 * - We need credentials (cookies) for auth
 */
export async function sendChatMessage(
  sessionId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
    signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    callbacks.onError?.(error.detail || 'Failed to send message')
    return
  }

  if (response.body === null) {
    callbacks.onError?.('No response stream')
    return
  }
  const reader = response.body.getReader()

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by double newlines
      const events = buffer.split('\n\n')
      // Keep the last (potentially incomplete) chunk in the buffer
      buffer = events.pop() || ''

      for (const eventStr of events) {
        processSseEvent(eventStr, callbacks)
      }
    }

    processSseEvent(buffer, callbacks)
  } finally {
    reader.releaseLock()
  }
}

// ── useChat Hook ─────────────────────────────────────────────────

export interface ChatUIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  status?: string
}

interface UseChatReturn {
  messages: ChatUIMessage[]
  sessionId: string | null
  isLoading: boolean
  statusMessage: string | null
  sendMessage: (content: string) => Promise<void>
  clearChat: () => void
}

/**
 * React hook for the AI chatbot — manages session, messages, and streaming.
 *
 * Similar to Vercel AI SDK's `useChat`, but built for our SSE backend.
 * Handles:
 *   - Auto-creating a session on first message
 *   - Sending messages and streaming responses
 *   - Optimistic UI (user message appears instantly)
 *   - Status updates during tool execution
 *   - Abort on unmount
 */
export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatUIMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setStatusMessage(null)

    // Optimistic: add user message immediately
    const userMsg: ChatUIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      // Create session on first message
      let activeSessionId = sessionId
      if (!activeSessionId) {
        const session = await chatApi.createSession()
        activeSessionId = session.id
        setSessionId(activeSessionId)
      }

      // Add a placeholder for the assistant response
      const assistantMsgId = `assistant-${Date.now()}`
      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
      ])

      await sendChatMessage(
        activeSessionId,
        content.trim(),
        {
          onStatus: (message) => {
            setStatusMessage(message)
          },
          onChunk: (text) => {
            setStatusMessage(null)
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: text, isStreaming: true }
                  : m,
              ),
            )
          },
          onDone: (text) => {
            setStatusMessage(null)
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: text, isStreaming: false }
                  : m,
              ),
            )
          },
          onError: (message) => {
            setStatusMessage(null)
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: message || 'Something went wrong.', isStreaming: false }
                  : m,
              ),
            )
          },
        },
        controller.signal,
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => [
          ...prev.filter(m => !m.isStreaming),
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Failed to connect to the AI service. Please try again.',
          },
        ])
      }
    } finally {
      setIsLoading(false)
      setStatusMessage(null)
      abortRef.current = null
    }
  }, [sessionId, isLoading])

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setSessionId(null)
    setIsLoading(false)
    setStatusMessage(null)
  }, [])

  return { messages, sessionId, isLoading, statusMessage, sendMessage, clearChat }
}
