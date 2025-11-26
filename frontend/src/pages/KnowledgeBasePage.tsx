import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Send, Loader2, Sparkles, Copy, Check, PlusCircle, Menu } from "lucide-react";
import { toast } from "sonner";
import log from "@/services/logging";
import {
  sendMessageStream,
  createConversation,
  getMessages,
  getConversations,
  deleteConversation,
} from "@/services/knowledge-base";
import type { ChatMessage, Conversation } from "@/types/knowledge-base";
import { cn } from "@/lib/utils";
import { SourceList } from "@/components/features/knowledge-base/SourceList";
import { ConversationList } from "@/components/features/knowledge-base/ConversationList";
import ReactMarkdown from 'react-markdown';

export function KnowledgeBasePage() {
  log.info("KnowledgeBasePage rendered");

  const { token, user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch conversations on mount
  useEffect(() => {
    if (!token) return;

    const fetchConversationsList = async () => {
      setLoadingConversations(true);
      try {
        log.debug("Fetching conversations list");
        const convs = await getConversations(token);
        setConversations(convs);
        log.info(`Loaded ${convs.length} conversations`);
      } catch (error) {
        log.error("Failed to load conversations", error);
        toast.error("Failed to load conversations");
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversationsList();
  }, [token]);

  // Load messages when conversation ID changes
  useEffect(() => {
    if (!conversationId || !token) return;

    const loadMessages = async () => {
      setLoadingHistory(true);
      try {
        log.debug(`Loading messages for conversation ${conversationId}`);
        const loadedMessages = await getMessages(token, conversationId);
        setMessages(loadedMessages);
        log.info(`Loaded ${loadedMessages.length} messages`);
      } catch (error) {
        log.error("Failed to load messages", error);
        toast.error("Failed to load conversation history");
      } finally {
        setLoadingHistory(false);
      }
    };

    loadMessages();
  }, [conversationId, token]);

  // Helper to generate conversation title from first message
  const generateTitle = (firstMessage: string): string => {
    const maxLength = 50;
    if (firstMessage.length <= maxLength) return firstMessage;
    return firstMessage.substring(0, maxLength) + '...';
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setIsSidebarOpen(false);
    log.info("Started new conversation");
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    setIsSidebarOpen(false);
    log.info(`Selected conversation: ${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    if (!token) return;

    try {
      await deleteConversation(token, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));

      // If deleting current conversation, start new one
      if (id === conversationId) {
        handleNewConversation();
      }

      toast.success("Conversation deleted");
      log.info(`Deleted conversation: ${id}`);
    } catch (error) {
      log.error("Failed to delete conversation", error);
      toast.error("Failed to delete conversation");
    }
  };

  async function handleSendMessage() {
    if (!input.trim() || !token) return;

    const messageText = input.trim();
    setInput("");

    try {
      setLoading(true);

      // Create conversation if this is the first message
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        log.debug("Creating new conversation");
        const title = generateTitle(messageText);
        const newConversation = await createConversation(token, title);
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);

        // Add to conversations list
        setConversations((prev) => [newConversation, ...prev]);
        log.info(`Created conversation: ${currentConversationId}`);
      }

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        conversation_id: currentConversationId,
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder for assistant message
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        conversation_id: currentConversationId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream response
      let fullResponse = "";
      for await (const result of sendMessageStream(token, {
        message: messageText,
        conversation_id: currentConversationId,
      })) {
        if (result.type === 'content' && result.content) {
          fullResponse += result.content;
          // Update assistant message with streaming content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        } else if (result.type === 'sources' && result.sources) {
          // Update assistant message with sources
          log.debug(`Received ${result.sources.length} sources`);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, sources: result.sources }
                : msg
            )
          );
        } else if (result.type === 'conversation_id' && result.conversationId) {
          // Update conversation ID if provided by backend
          log.debug(`Backend provided conversation ID: ${result.conversationId}`);
          setConversationId(result.conversationId);
        } else if (result.type === 'done') {
          log.debug("Streaming completed");
        }
      }

      log.info("Streaming message completed");
    } catch (error) {
      log.error("Failed to send message", error);
      toast.error("Failed to send message");
      // Remove the failed assistant message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  if (!token || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Please log in to use Knowledge Base
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-full overflow-hidden bg-background">
      {/* Mobile: Sheet overlay for sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <ConversationList
            conversations={conversations}
            currentConversationId={conversationId}
            isLoading={loadingConversations}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden md:flex w-80 border-r flex-col">
        <ConversationList
          conversations={conversations}
          currentConversationId={conversationId}
          isLoading={loadingConversations}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header with mobile menu and New Conversation button */}
        <div className="flex items-center gap-4 px-4 py-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="ml-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Messages Area - Scrollable, takes remaining space */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center min-h-full px-4">
            <div className="max-w-2xl w-full text-center space-y-8 py-12">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h2 className="text-2xl">Ask Me Anything</h2>
                <p className="text-muted-foreground">
                  Get AI-powered insights from your meetings
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "What were the main decisions?",
                  "Show me action items",
                  "Summarize recent meetings",
                  "What topics were discussed?",
                ].map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                    className="text-sm"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t bg-background px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <div className="relative flex items-center">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message Knowledge Base"
                disabled={loading}
                className="w-full min-h-[52px] max-h-[200px] pr-12 resize-none rounded-3xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
                autoFocus
                rows={1}
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 rounded-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming =
    message.content === "" || message.id.startsWith("temp-assistant");

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div
      className={cn(
        "flex w-full group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 space-y-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted/80 border"
        )}
      >
        {/* Message text */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {message.content ? (
            <ReactMarkdown
              components={{
                // Custom components for better styling
                code: ({ node, inline, className, children, ...props }: any) => {
                  return inline ? (
                    <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-muted p-2 rounded my-2 text-sm overflow-x-auto" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children, ...props }: any) => (
                  <p className="whitespace-pre-wrap leading-relaxed m-0" {...props}>
                    {children}
                  </p>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : null}
          {isStreaming && message.content && (
            <span className="inline-block w-0.5 h-5 ml-1 bg-current animate-pulse" />
          )}
          {isStreaming && !message.content && (
            <div className="flex gap-1 items-center">
              <div
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="pt-2 border-t">
            <SourceList sources={message.sources} />
          </div>
        )}

        {/* Copy button - appears on hover */}
        {!isStreaming && message.content && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity -mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={cn(
                "h-6 px-2 text-xs",
                isUser
                  ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  : ""
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
