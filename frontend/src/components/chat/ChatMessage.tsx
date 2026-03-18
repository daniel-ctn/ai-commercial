import { memo } from 'react'
import { Loader2, Bot, User } from 'lucide-react'
import type { ChatUIMessage } from '#/lib/chat'

interface ChatMessageProps {
  message: ChatUIMessage
}

/**
 * Renders a single chat message bubble.
 *
 * User messages: right-aligned, lagoon-tinted background
 * Assistant messages: left-aligned, surface background, with markdown-like formatting
 */
export const ChatMessageBubble = memo(function ({
  message,
}: ChatMessageProps) {
  return <ChatMessageBubbleContent message={message} />
})

function ChatMessageBubbleContent({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-end gap-2">
          <div className="rounded-2xl rounded-br-sm bg-[var(--lagoon)] px-3.5 py-2 text-sm text-white">
            {message.content}
          </div>
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--lagoon-deep)]">
            <User className="size-3.5 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-end gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] ring-1 ring-[var(--line)]">
          <Bot className="size-3.5 text-[var(--lagoon)]" />
        </div>
        <div className="rounded-2xl rounded-bl-sm border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--sea-ink)]">
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin text-[var(--lagoon)]" />
              <span className="text-xs text-[var(--sea-ink-soft)]">Thinking...</span>
            </div>
          ) : (
            <AssistantContent content={message.content} />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Renders assistant message content with basic markdown-like formatting.
 * Handles bold, bullet points, and line breaks.
 */
function AssistantContent({ content }: { content: string }) {
  const paragraphs = content.split('\n\n')

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, i) => (
        <AssistantParagraph key={i} text={paragraph} />
      ))}
    </div>
  )
}

function AssistantParagraph({ text }: { text: string }) {
  const lines = text.split('\n')

  const isList = lines.every(
    (l) => l.trim().startsWith('- ') || l.trim().startsWith('• ') || l.trim() === '',
  )

  if (isList && lines.some((l) => l.trim())) {
    return (
      <ul className="space-y-1 pl-3">
        {lines
          .filter((l) => l.trim())
          .map((line, i) => (
            <li key={i} className="list-disc text-sm leading-relaxed marker:text-[var(--lagoon)]">
              <InlineFormatted text={line.replace(/^[-•]\s*/, '')} />
            </li>
          ))}
      </ul>
    )
  }

  return (
    <p className="text-sm leading-relaxed">
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          <InlineFormatted text={line} />
        </span>
      ))}
    </p>
  )
}

function InlineFormatted({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded bg-[var(--chip-bg)] px-1 py-0.5 text-xs font-mono text-[var(--lagoon-deep)]"
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
