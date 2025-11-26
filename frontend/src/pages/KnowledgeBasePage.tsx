import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Send, Loader2, Sparkles, Copy, Check, PlusCircle, Menu, RotateCw, Edit2, Download } from "lucide-react";
import { toast } from "sonner";
import log from "@/services/logging";
import {
  sendMessageStream,
  createConversation,
  getMessages,
  getConversations,
  deleteConversation,
} from "@/services/knowledge-base";
import type { ChatMessage, Conversation, FilterContext } from "@/types/knowledge-base";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { SourceList } from "@/components/features/knowledge-base/SourceList";
import { ConversationList } from "@/components/features/knowledge-base/ConversationList";
import { FilterPanel } from "@/components/features/knowledge-base/FilterPanel";
import { CodeBlock } from "@/components/features/knowledge-base/CodeBlock";
import { SuggestedPrompts, getContextualSuggestions } from "@/components/features/knowledge-base/SuggestedPrompts";
import { exportConversation, type ExportFormat } from "@/utils/conversationExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterContext>({
    project_ids: [],
    tags: [],
    start_date: undefined,
    end_date: undefined,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch member projects for filter dropdown
  const { data: projects = [] } = useApi<Project[]>(
    `/project/member/${user?._id}`,
    {
      enabled: !!user?._id,
      token: token || undefined,
    }
  );

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K: Focus input
      if (modifier && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Cmd/Ctrl + N: New conversation
      if (modifier && e.key === 'n') {
        e.preventDefault();
        handleNewConversation();
      }

      // Cmd/Ctrl + E: Export conversation (if available)
      if (modifier && e.key === 'e' && conversationId && messages.length > 0) {
        e.preventDefault();
        handleExportConversation('markdown');
        toast.info("Exported as Markdown. Use Export dropdown for other formats.");
      }

      // Esc: Clear input
      if (e.key === 'Escape' && !loading) {
        setInput("");
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [conversationId, messages.length, loading]);

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

  const handleExportConversation = (format: ExportFormat) => {
    if (!conversationId || messages.length === 0) {
      toast.error("No conversation to export");
      return;
    }

    const currentConversation = conversations.find((c) => c.id === conversationId);
    if (!currentConversation) {
      toast.error("Conversation not found");
      return;
    }

    try {
      exportConversation(currentConversation, messages, format);
      toast.success(`Conversation exported as ${format.toUpperCase()}`);
      log.info(`Exported conversation ${conversationId} as ${format}`);
    } catch (error) {
      log.error("Failed to export conversation", error);
      toast.error("Failed to export conversation");
    }
  };

  const handleRegenerateMessage = async (assistantMessageId: string) => {
    if (!token || !conversationId) return;

    try {
      setRegeneratingId(assistantMessageId);

      // Find the index of the assistant message
      const assistantIndex = messages.findIndex((m) => m.id === assistantMessageId);
      if (assistantIndex === -1) return;

      // Find the previous user message
      let userMessage: ChatMessage | null = null;
      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMessage = messages[i];
          break;
        }
      }

      if (!userMessage) {
        toast.error("Cannot find user message to regenerate");
        return;
      }

      // Remove the assistant message and all messages after it
      setMessages((prev) => prev.slice(0, assistantIndex));

      // Create new assistant message placeholder
      const newAssistantMessageId = `temp-assistant-${Date.now()}`;
      const newAssistantMessage: ChatMessage = {
        id: newAssistantMessageId,
        conversation_id: conversationId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newAssistantMessage]);

      // Stream response with filters
      let fullResponse = "";
      for await (const result of sendMessageStream(token, {
        message: userMessage.content,
        conversation_id: conversationId,
        filters: filters.project_ids?.length || filters.tags?.length || filters.start_date || filters.end_date
          ? filters
          : undefined,
      })) {
        if (result.type === 'content' && result.content) {
          fullResponse += result.content;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAssistantMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        } else if (result.type === 'sources' && result.sources) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAssistantMessageId
                ? { ...msg, sources: result.sources }
                : msg
            )
          );
        }
      }

      log.info("Message regenerated successfully");
      toast.success("Response regenerated");
    } catch (error) {
      log.error("Failed to regenerate message", error);
      toast.error("Failed to regenerate response");
    } finally {
      setRegeneratingId(null);
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

      // Stream response with filters
      let fullResponse = "";
      for await (const result of sendMessageStream(token, {
        message: messageText,
        conversation_id: currentConversationId,
        filters: filters.project_ids?.length || filters.tags?.length || filters.start_date || filters.end_date
          ? filters
          : undefined,
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
          <div className="ml-auto flex items-center gap-2">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableProjects={projects.map((p) => ({ id: p._id, name: p.name }))}
              availableTags={[]}
            />

            {/* Export conversation dropdown */}
            {conversationId && messages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportConversation("markdown")}>
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportConversation("json")}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportConversation("text")}>
                    Export as Text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
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

              {/* Contextual Suggestions */}
              <SuggestedPrompts
                suggestions={getContextualSuggestions({
                  hasMessages: false,
                  filters,
                })}
                onSelect={setInput}
                title="Try asking:"
                className="flex flex-col items-center"
              />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={
                  message.role === "assistant"
                    ? () => handleRegenerateMessage(message.id)
                    : undefined
                }
                isRegenerating={regeneratingId === message.id}
              />
            ))}

            {/* Follow-up suggestions after last assistant message */}
            {messages.length > 0 &&
             messages[messages.length - 1]?.role === "assistant" &&
             !loading && (
              <SuggestedPrompts
                suggestions={getContextualSuggestions({
                  hasMessages: true,
                  lastMessage: messages[messages.length - 1]?.content,
                  filters,
                })}
                onSelect={setInput}
                title="Follow up with:"
              />
            )}

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
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message Knowledge Base (Cmd/Ctrl + K to focus)"
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
    {/* End of Main chat area */}
    </div>
    {/* End of main container */}
  );
}

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function MessageBubble({ message, onRegenerate, isRegenerating }: MessageBubbleProps) {
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
                  // Extract language from className (e.g., "language-typescript")
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : undefined;
                  const codeString = String(children).replace(/\n$/, "");

                  return (
                    <CodeBlock inline={inline} language={language}>
                      {codeString}
                    </CodeBlock>
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

        {/* Action buttons - appear on hover */}
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

            {/* Regenerate button for assistant messages */}
            {!isUser && onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="h-6 px-2 text-xs"
              >
                <RotateCw className={cn("h-3 w-3 mr-1", isRegenerating && "animate-spin")} />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
