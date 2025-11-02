import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  Bot,
  User,
} from "lucide-react";
import { toast } from "sonner";
import log from "@/services/logging";
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessageStream,
} from "@/services/knowledge-base";
import type {
  Conversation,
  ChatMessage,
  MessageSource,
} from "@/types/knowledge-base";
import { cn } from "@/lib/utils";

export function KnowledgeBasePage() {
  log.info("KnowledgeBasePage rendered");

  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingConversations(true);
      const data = await getConversations(token);
      setConversations(data);
      log.info(`Loaded ${data.length} conversations`);
    } catch (error) {
      log.error("Failed to load conversations", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  }, [token]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!token) return;

      try {
        const data = await getMessages(token, conversationId);
        setMessages(data);
        log.info(
          `Loaded ${data.length} messages for conversation ${conversationId}`
        );
      } catch (error) {
        log.error("Failed to load messages", error);
        toast.error("Failed to load messages");
      }
    },
    [token]
  );

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation, loadMessages]);

  async function handleNewConversation() {
    if (!token) return;

    try {
      const conversation = await createConversation(token);
      setConversations([conversation, ...conversations]);
      setSelectedConversation(conversation);
      setMessages([]);
      toast.success("New conversation started");
      log.info(`Created new conversation: ${conversation.id}`);
    } catch (error) {
      log.error("Failed to create conversation", error);
      toast.error("Failed to start new conversation");
    }
  }

  async function handleSendMessage() {
    if (!input.trim() || !token) return;

    const messageText = input.trim();
    setInput("");

    try {
      setLoading(true);

      // If no conversation selected, create one
      let conversationId = selectedConversation?.id;
      if (!conversationId) {
        const newConv = await createConversation(token);
        setSelectedConversation(newConv);
        setConversations([newConv, ...conversations]);
        conversationId = newConv.id;
      }

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversationId,
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder for assistant message
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        conversation_id: conversationId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream response
      let fullResponse = "";
      for await (const chunk of sendMessageStream(token, {
        message: messageText,
        conversation_id: conversationId,
        stream: true,
      })) {
        fullResponse += chunk;
        // Update assistant message with streaming content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse }
              : msg
          )
        );
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
    <div className="flex h-full">
      {/* Sidebar - Conversations List */}
      <div className="w-64 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleNewConversation} className="w-full" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                  "hover:bg-accent",
                  selectedConversation?.id === conv.id && "bg-accent"
                )}
              >
                <div className="font-medium text-sm truncate">{conv.title}</div>
                <div className="text-xs text-muted-foreground">
                  {conv.message_count} messages
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">
              {selectedConversation?.title || "Knowledge Base Chat"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ask questions about your meetings and get AI-powered answers
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Ask Me Anything</h2>
              <p className="text-muted-foreground max-w-md mb-8">
                I can help you find information from your meetings, summarize
                discussions, track action items, and more.
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {[
                  "What were the main decisions from yesterday's meeting?",
                  "Show me action items assigned to me",
                  "Summarize last week's sprint planning",
                  "What topics were discussed about the project timeline?",
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-background/95 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-3 max-w-4xl mx-auto"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your meetings..."
              disabled={loading}
              className="flex-1 h-12 px-4 text-base rounded-full bg-muted/50 border-0 focus-visible:ring-2"
              autoFocus
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="lg"
              className="h-12 w-12 rounded-full"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            AI responses may contain inaccuracies. Always verify important
            information.
          </p>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isStreaming =
    message.content === "" || message.id.startsWith("temp-assistant");

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted border rounded-tl-sm"
        )}
      >
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
          {isStreaming && message.content && (
            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
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
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-xs font-medium mb-2 opacity-70">
              Sources ({message.sources.length}):
            </div>
            <div className="space-y-2">
              {message.sources.slice(0, 3).map((source, idx) => (
                <SourceCard key={idx} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className={cn("text-xs mt-2 opacity-50")}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <span className="text-xs font-semibold">You</span>
        </div>
      )}
    </div>
  );
}

// Source Card Component
function SourceCard({ source }: { source: MessageSource }) {
  return (
    <div className="text-xs p-2 rounded bg-background/50 border">
      <div className="font-medium truncate">{source.meeting_title}</div>
      <div className="text-muted-foreground mt-1">
        {source.content_type} • Score: {(source.score * 100).toFixed(0)}%
      </div>
    </div>
  );
}
