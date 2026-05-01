'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquarePlus, 
  Send, 
  Bot, 
  User, 
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskChatProps {
  onTaskCreated?: () => void
}

export function TaskChat({ onTaskCreated }: TaskChatProps) {
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat/tasks' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Check for successful task creation in messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant') {
      const textParts = lastMessage.parts?.filter(p => p.type === 'text') || []
      const hasTaskCreated = textParts.some(p => 
        p.type === 'text' && (
          p.text.toLowerCase().includes('created successfully') ||
          p.text.toLowerCase().includes('task has been created')
        )
      )
      if (hasTaskCreated && onTaskCreated) {
        onTaskCreated()
      }
    }
  }, [messages, onTaskCreated])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleClearChat = () => {
    setMessages([])
  }

  const suggestedPrompts = [
    'Create a GST return task for tomorrow',
    'Add urgent ITR filing task for ABC Corp',
    'New TDS payment task due next week',
  ]

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 shadow-2xl transition-all duration-200 z-50 flex flex-col",
      isExpanded 
        ? "w-[500px] h-[600px]" 
        : "w-[380px] h-[500px]"
    )}>
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">Task Assistant</CardTitle>
              <p className="text-xs text-muted-foreground">Create tasks with natural language</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Bot className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">How can I help you today?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tell me what task you want to create
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Try saying:</p>
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt)
                    }}
                    className="w-full text-left text-xs p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.parts?.map((part, index) => {
                      if (part.type === 'text') {
                        return <span key={index}>{part.text}</span>
                      }
                      if (part.type === 'tool-invocation') {
                        if (part.toolInvocation.toolName === 'createTask') {
                          const state = part.toolInvocation.state
                          if (state === 'result') {
                            const result = part.toolInvocation.result as { success: boolean; task?: { title: string; priority: string; due_date: string } }
                            if (result.success && result.task) {
                              return (
                                <div key={index} className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="font-medium text-xs">Task Created</span>
                                  </div>
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium">{result.task.title}</p>
                                    <div className="flex gap-2">
                                      <Badge variant="outline" className="text-xs h-5">
                                        {result.task.priority}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        Due: {result.task.due_date}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                          } else {
                            return (
                              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Creating task...
                              </div>
                            )
                          }
                        }
                      }
                      return null
                    })}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 flex-shrink-0">
          {messages.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleClearChat}
              >
                Clear chat
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the task you want to create..."
              disabled={isLoading}
              className="text-sm"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
