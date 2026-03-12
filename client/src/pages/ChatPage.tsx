import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send, Bot, User, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { SourcesAccordion } from '@/components/chat/SourcesAccordion'
import { queryDocuments } from '@/api/client'
import type { SourceDocument } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceDocument[]
  isLoading?: boolean
  isError?: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async () => {
    const query = input.trim()
    if (!query || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: query }
    const loadingId = crypto.randomUUID()
    const loadingMsg: Message = { id: loadingId, role: 'assistant', content: '', isLoading: true }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await queryDocuments(query)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, content: response.answer, sources: response.sources, isLoading: false }
            : msg,
        ),
      )
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, content: errorText, isLoading: false, isError: true }
            : msg,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Message list */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
              <Bot className="mb-4 h-12 w-12 opacity-30" />
              <h2 className="text-lg font-medium text-foreground">
                Ask your documents anything
              </h2>
              <p className="mt-1 text-sm">
                Your answers will include sources from SharePoint documents.
              </p>
              <p className="mt-3 text-xs">
                Press <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">Enter</kbd> to
                send · <kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">Shift+Enter</kbd>{' '}
                for new line
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Bubble + sources */}
              <div
                className={`flex max-w-[80%] flex-col gap-2 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.isError
                        ? 'border border-destructive/50 bg-destructive/10 text-destructive'
                        : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="space-y-2 py-1">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-64" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  ) : msg.isError ? (
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {msg.content}
                    </span>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>

                {!msg.isLoading &&
                  !msg.isError &&
                  msg.role === 'assistant' &&
                  msg.sources &&
                  msg.sources.length > 0 && <SourcesAccordion sources={msg.sources} />}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="border-t bg-background px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents…"
            rows={2}
            disabled={isLoading}
            className="resize-none flex-1"
          />
          <Button
            onClick={() => void handleSubmit()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
