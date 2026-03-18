import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, X, Send, Loader2, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useAuth } from '#/lib/auth'
import { useChat } from '#/lib/chat'
import { ChatMessageBubble } from '#/components/chat/ChatMessage'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { user } = useAuth()
  const { messages, isLoading, statusMessage, sendMessage, clearChat } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, statusMessage])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      sendMessage(input)
      setInput('')
    },
    [input, isLoading, sendMessage],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit],
  )

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-[var(--lagoon)] text-white shadow-lg transition-all hover:scale-105 hover:bg-[var(--lagoon-deep)] active:scale-95"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="size-6" /> : <MessageSquare className="size-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-5 bottom-22 z-50 flex h-[min(580px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--foam)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--lagoon)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
                  AI Shopping Assistant
                </h3>
                <p className="text-xs text-[var(--sea-ink-soft)]">
                  Ask about products, deals & more
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={clearChat}
                title="New conversation"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {!user ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <MessageSquare className="size-10 text-[var(--sea-ink-soft)] opacity-40" />
                <p className="text-sm font-medium text-[var(--sea-ink)]">
                  Sign in to chat
                </p>
                <p className="text-xs text-[var(--sea-ink-soft)]">
                  Log in to ask our AI assistant about products, deals, and more.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Sparkles className="size-10 text-[var(--lagoon)] opacity-50" />
                <div>
                  <p className="text-sm font-medium text-[var(--sea-ink)]">
                    How can I help you?
                  </p>
                  <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
                    Try asking about products, comparing prices, or finding deals.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {[
                    'What products are on sale?',
                    'Find me laptop deals',
                    'Show active coupons',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion)
                        inputRef.current?.focus()
                      }}
                      className="rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-xs text-[var(--sea-ink-soft)] transition-colors hover:border-[var(--lagoon)] hover:text-[var(--lagoon)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <ChatMessageBubble key={msg.id} message={msg} />
                ))}

                {statusMessage && (
                  <div className="flex items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
                    <Loader2 className="size-3 animate-spin" />
                    {statusMessage}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          {user && (
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 border-t border-[var(--line)] bg-[var(--surface-strong)] px-3 py-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about products, deals..."
                disabled={isLoading}
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--foam)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder-[var(--sea-ink-soft)] outline-none transition-colors focus:border-[var(--lagoon)] disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="shrink-0 bg-[var(--lagoon)] hover:bg-[var(--lagoon-deep)]"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      )}
    </>
  )
}
