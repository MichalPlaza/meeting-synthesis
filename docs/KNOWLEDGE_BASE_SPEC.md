# Knowledge Base - Specyfikacja Funkcjonalna

## 📋 Przegląd

Ekran Knowledge Base to interfejs czatowy umożliwiający konwersacyjne przeszukiwanie wszystkich materiałów z meetingów przypisanych do konta użytkownika. System wykorzystuje **Elasticsearch z hybrid search** (połączenie semantic search i keyword search) do precyzyjnego odnajdywania informacji.

---

## 🎯 Cel

Umożliwić użytkownikowi:

- Zadawanie pytań w języku naturalnym o treści z wszystkich meetingów
- Otrzymywanie kontekstowych odpowiedzi z odnośnikami do źródeł
- Przeglądanie historii konwersacji
- Filtrowanie zakresu wyszukiwania (projekty, tagi, daty)

---

## 🏗️ Architektura

### Backend Stack

```
FastAPI → Elasticsearch (hybrid search) → Ollama (LLM) → MongoDB (metadata)
```

### Frontend Stack

```
React 19 + TypeScript + Tailwind CSS + shadcn/ui
```

### Data Flow

```
User Query → Backend API → Elasticsearch (hybrid search)
           → Retrieve Documents → Ollama (RAG)
           → Generate Answer → Stream Response → Frontend
```

---

## 📊 Struktura Danych

### 1. Elasticsearch Index Schema

```json
{
  "mappings": {
    "properties": {
      "meeting_id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "user_id": { "type": "keyword" },
      "title": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "content": {
        "type": "text",
        "analyzer": "standard"
      },
      "content_type": {
        "type": "keyword",
        "enum": [
          "transcription",
          "summary",
          "key_topic",
          "action_item",
          "decision"
        ]
      },
      "tags": { "type": "keyword" },
      "meeting_datetime": { "type": "date" },
      "created_at": { "type": "date" },
      "embedding": {
        "type": "dense_vector",
        "dims": 384,
        "index": true,
        "similarity": "cosine"
      },
      "metadata": {
        "type": "object",
        "properties": {
          "speaker": { "type": "keyword" },
          "timestamp": { "type": "keyword" },
          "confidence": { "type": "float" }
        }
      }
    }
  }
}
```

### 2. Chat Message Model (MongoDB)

```python
# backend/app/models/knowledge_base.py

from datetime import datetime, UTC
from pydantic import BaseModel, Field
from .py_object_id import PyObjectId

class ChatMessage(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    conversation_id: PyObjectId
    role: str  # "user" | "assistant" | "system"
    content: str
    sources: list[MessageSource] | None = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {PyObjectId: str}

class MessageSource(BaseModel):
    meeting_id: str
    meeting_title: str
    content_type: str
    excerpt: str
    relevance_score: float
    timestamp: str | None = None

class Conversation(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    title: str  # Auto-generated from first message
    filter_context: FilterContext | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {PyObjectId: str}

class FilterContext(BaseModel):
    project_ids: list[str] | None = []
    tags: list[str] | None = []
    date_from: datetime | None = None
    date_to: datetime | None = None
```

### 3. Frontend Types

```typescript
// frontend/src/types/knowledgeBase.ts

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: MessageSource[];
  createdAt: string;
  isStreaming?: boolean;
}

export interface MessageSource {
  meetingId: string;
  meetingTitle: string;
  contentType:
    | "transcription"
    | "summary"
    | "key_topic"
    | "action_item"
    | "decision";
  excerpt: string;
  relevanceScore: number;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  title: string;
  filterContext?: FilterContext;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface FilterContext {
  projectIds?: string[];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchFilters {
  projects: string[];
  tags: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}
```

---

## 🎨 UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Knowledge Base" [Filter Button] [New Chat] [User] │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  Sidebar    │           Chat Area                           │
│  (280px)    │                                               │
│             │  ┌─────────────────────────────────────────┐ │
│ [Filters]   │  │ Assistant: Here's what I found...       │ │
│             │  │ Sources: [Meeting 1] [Meeting 2]        │ │
│ Projects:   │  └─────────────────────────────────────────┘ │
│ ☑ Project 1 │                                               │
│ ☐ Project 2 │  ┌─────────────────────────────────────────┐ │
│             │  │ User: What were the action items from...│ │
│ Tags:       │  └─────────────────────────────────────────┘ │
│ ☑ marketing │                                               │
│ ☐ dev       │  [Typing indicator...]                        │
│             │                                               │
│ Date Range  │                                               │
│ [From][To]  │                                               │
│             │                                               │
│ ─────────   │  ─────────────────────────────────────────── │
│             │                                               │
│ Recent      │  ┌───────────────────────────────────────┐   │
│ Chats:      │  │ [Type your question...]         [Send]│   │
│             │  └───────────────────────────────────────┘   │
│ > Conv 1    │                                               │
│   Conv 2    │                                               │
│   Conv 3    │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Main Container** (`KnowledgeBasePage.tsx`)

```tsx
<div className="flex h-screen bg-background">
  <KnowledgeBaseSidebar
    filters={filters}
    onFilterChange={handleFilterChange}
    conversations={conversations}
    activeConversation={activeConversation}
    onConversationSelect={handleConversationSelect}
  />
  <KnowledgeBaseChatArea
    messages={messages}
    isStreaming={isStreaming}
    onSendMessage={handleSendMessage}
  />
</div>
```

#### 2. **Sidebar** (`KnowledgeBaseSidebar.tsx`)

- **Filter Section**
  - Project multi-select (checkboxes)
  - Tag multi-select (checkboxes)
  - Date range picker
  - "Clear Filters" button
  - Active filter badges
- **Conversations List**
  - Recent conversations (scrollable)
  - Conversation preview (title + last message)
  - Active conversation highlight
  - Delete conversation button (hover)

#### 3. **Chat Area** (`KnowledgeBaseChatArea.tsx`)

- **Messages Container**
  - Message bubbles (user/assistant)
  - Timestamp
  - Source chips (clickable)
  - Streaming animation
  - Auto-scroll to bottom
- **Input Area**
  - Textarea with auto-resize
  - Send button
  - Character counter (optional)
  - "Searching..." indicator

#### 4. **Message Components**

- `UserMessage.tsx` - User query bubble (right-aligned)
- `AssistantMessage.tsx` - AI response bubble (left-aligned)
- `MessageSource.tsx` - Source reference chip
- `StreamingIndicator.tsx` - Typing animation
- `SourceDrawer.tsx` - Detailed source view (modal/drawer)

---

## 🔧 Backend Implementation

### API Endpoints

#### 1. **Knowledge Base Search**

```python
# backend/app/apis/v1/endpoints_knowledge_base.py

@router.post("/knowledge-base/search", response_model=SearchResponse)
async def search_knowledge_base(
    query: KnowledgeBaseQuery,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    Perform hybrid search across user's meetings.

    Args:
        query: Search query with filters

    Returns:
        SearchResponse with relevant documents and scores
    """
    pass
```

**Request Schema:**

```python
class KnowledgeBaseQuery(BaseModel):
    query: str
    conversation_id: str | None = None
    filters: FilterContext | None = None
    max_results: int = 10
```

**Response Schema:**

```python
class SearchResponse(BaseModel):
    results: list[SearchResult]
    total_found: int
    query_embedding: list[float] | None = None

class SearchResult(BaseModel):
    meeting_id: str
    meeting_title: str
    content: str
    content_type: str
    score: float
    hybrid_score: HybridScore
    metadata: dict

class HybridScore(BaseModel):
    semantic_score: float
    keyword_score: float
    combined_score: float
```

#### 2. **Chat Completion (Streaming)**

```python
@router.post("/knowledge-base/chat")
async def chat_completion(
    request: ChatRequest,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    Stream chat completion with RAG.

    Flow:
    1. Search Elasticsearch (hybrid)
    2. Retrieve top-k documents
    3. Build context prompt
    4. Stream from Ollama
    5. Save message to MongoDB
    """
    async def event_generator():
        # 1. Hybrid search
        search_results = await elasticsearch_service.hybrid_search(
            query=request.message,
            user_id=str(current_user.id),
            filters=request.filters
        )

        # 2. Build RAG prompt
        context = build_rag_context(search_results)

        # 3. Stream from Ollama
        async for chunk in ollama_service.stream_chat(
            messages=request.conversation_history,
            context=context
        ):
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # 4. Send sources
        sources = format_sources(search_results)
        yield f"data: {json.dumps({'sources': sources})}\n\n"

        # 5. Save to DB
        await save_chat_message(...)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

#### 3. **Conversation Management**

```python
@router.get("/knowledge-base/conversations", response_model=list[Conversation])
async def get_conversations(
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """Get user's recent conversations."""
    pass

@router.post("/knowledge-base/conversations", response_model=Conversation)
async def create_conversation(
    request: CreateConversationRequest,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """Create new conversation."""
    pass

@router.delete("/knowledge-base/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """Delete conversation and its messages."""
    pass

@router.get("/knowledge-base/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """Get all messages from conversation."""
    pass
```

#### 4. **Meeting Indexing (Background Task)**

```python
# backend/app/services/elasticsearch_service.py

async def index_meeting(meeting_id: str):
    """
    Index meeting content to Elasticsearch.

    Triggered after meeting processing completes.
    """
    meeting = await get_meeting(meeting_id)

    # 1. Generate embeddings
    transcription_embedding = await generate_embedding(meeting.transcription.full_text)

    # 2. Index transcription
    await es_client.index(
        index="meetings_knowledge_base",
        document={
            "meeting_id": str(meeting.id),
            "project_id": str(meeting.project_id),
            "user_id": str(meeting.uploader_id),
            "title": meeting.title,
            "content": meeting.transcription.full_text,
            "content_type": "transcription",
            "tags": meeting.tags,
            "meeting_datetime": meeting.meeting_datetime,
            "embedding": transcription_embedding,
        }
    )

    # 3. Index AI analysis sections
    if meeting.ai_analysis:
        # Index summary
        summary_embedding = await generate_embedding(meeting.ai_analysis.summary)
        await es_client.index(...)

        # Index key topics
        for topic in meeting.ai_analysis.key_topics:
            topic_embedding = await generate_embedding(topic.topic_name + " " + topic.key_points)
            await es_client.index(...)

        # Index action items
        # Index decisions
        # etc.
```

### Elasticsearch Hybrid Search

```python
# backend/app/services/elasticsearch_service.py

async def hybrid_search(
    query: str,
    user_id: str,
    filters: FilterContext | None = None,
    top_k: int = 10
) -> list[SearchResult]:
    """
    Perform hybrid search (semantic + keyword).

    Args:
        query: User's question
        user_id: Filter to user's documents
        filters: Additional filters (projects, tags, dates)
        top_k: Number of results

    Returns:
        Ranked list of relevant documents
    """
    # 1. Generate query embedding
    query_embedding = await generate_embedding(query)

    # 2. Build Elasticsearch query
    es_query = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"user_id": user_id}}
                ],
                "should": [
                    # Semantic search (KNN)
                    {
                        "script_score": {
                            "query": {"match_all": {}},
                            "script": {
                                "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                "params": {"query_vector": query_embedding}
                            }
                        }
                    },
                    # Keyword search (BM25)
                    {
                        "multi_match": {
                            "query": query,
                            "fields": ["title^3", "content^2", "tags^2"],
                            "type": "best_fields",
                            "boost": 1.0
                        }
                    }
                ],
                "minimum_should_match": 1
            }
        },
        "size": top_k
    }

    # 3. Apply filters
    if filters:
        if filters.project_ids:
            es_query["query"]["bool"]["must"].append({
                "terms": {"project_id": filters.project_ids}
            })
        if filters.tags:
            es_query["query"]["bool"]["must"].append({
                "terms": {"tags": filters.tags}
            })
        if filters.date_from or filters.date_to:
            date_range = {}
            if filters.date_from:
                date_range["gte"] = filters.date_from
            if filters.date_to:
                date_range["lte"] = filters.date_to
            es_query["query"]["bool"]["must"].append({
                "range": {"meeting_datetime": date_range}
            })

    # 4. Execute search
    response = await es_client.search(
        index="meetings_knowledge_base",
        body=es_query
    )

    # 5. Parse and rank results
    results = []
    for hit in response["hits"]["hits"]:
        results.append(SearchResult(
            meeting_id=hit["_source"]["meeting_id"],
            meeting_title=hit["_source"]["title"],
            content=hit["_source"]["content"],
            content_type=hit["_source"]["content_type"],
            score=hit["_score"],
            hybrid_score=calculate_hybrid_score(hit),
            metadata=hit["_source"].get("metadata", {})
        ))

    return results
```

### RAG Prompt Template

```python
# backend/app/services/ollama_service.py

def build_rag_context(search_results: list[SearchResult]) -> str:
    """Build context from search results for RAG."""

    context_parts = []

    for i, result in enumerate(search_results[:5], 1):
        context_parts.append(f"""
[Document {i}]
Meeting: {result.meeting_title}
Type: {result.content_type}
Content: {result.content[:500]}...
---
""")

    return "\n".join(context_parts)

async def stream_chat(
    messages: list[dict],
    context: str
) -> AsyncIterator[str]:
    """Stream chat completion with RAG context."""

    system_prompt = f"""You are a helpful AI assistant for Meeting Synthesis knowledge base.

Your role is to answer questions about meetings based on the provided context.

Context from meetings:
{context}

Instructions:
- Answer questions based ONLY on the provided context
- If the answer is not in the context, say "I don't have information about that in your meetings."
- Always cite which meeting the information comes from
- Be concise and precise
- Use bullet points for lists
- Respond in the same language as the question (Polish or English)
"""

    full_messages = [
        {"role": "system", "content": system_prompt},
        *messages
    ]

    async for chunk in ollama_client.chat(
        model="llama3.1:8b",
        messages=full_messages,
        stream=True
    ):
        if chunk["message"]["content"]:
            yield chunk["message"]["content"]
```

---

## 🎨 Frontend Implementation

### Page Component

```tsx
// frontend/src/pages/KnowledgeBasePage.tsx

import { useState, useEffect } from "react";
import { KnowledgeBaseSidebar } from "@/components/KnowledgeBaseSidebar";
import { KnowledgeBaseChatArea } from "@/components/KnowledgeBaseChatArea";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useAuth } from "@/AuthContext";

export function KnowledgeBasePage() {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    filters,
    isStreaming,
    sendMessage,
    selectConversation,
    createConversation,
    updateFilters,
  } = useKnowledgeBase();

  return (
    <div className="flex h-screen bg-background">
      <KnowledgeBaseSidebar
        filters={filters}
        onFilterChange={updateFilters}
        conversations={conversations}
        activeConversation={activeConversation}
        onConversationSelect={selectConversation}
        onNewChat={createConversation}
      />
      <KnowledgeBaseChatArea
        messages={messages}
        isStreaming={isStreaming}
        onSendMessage={sendMessage}
        filters={filters}
      />
    </div>
  );
}
```

### Custom Hook

```typescript
// frontend/src/hooks/useKnowledgeBase.ts

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/AuthContext";
import api from "@/services/api";
import {
  ChatMessage,
  Conversation,
  SearchFilters,
} from "@/types/knowledgeBase";

export function useKnowledgeBase() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    projects: [],
    tags: [],
    dateRange: { from: null, to: null },
  });
  const [isStreaming, setIsStreaming] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      const response = await api.get("/api/v1/knowledge-base/conversations");
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await api.get(
        `/api/v1/knowledge-base/conversations/${conversationId}/messages`
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      sources: [],
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Stream response using EventSource
      const eventSource = new EventSource(
        `/api/v1/knowledge-base/chat?` +
          new URLSearchParams({
            conversation_id: activeConversation || "",
            message: content,
            filters: JSON.stringify(filters),
          })
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.content) {
          // Update assistant message with streamed content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + data.content }
                : msg
            )
          );
        }

        if (data.sources) {
          // Add sources when streaming completes
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, sources: data.sources, isStreaming: false }
                : msg
            )
          );
          setIsStreaming(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setIsStreaming(false);
        eventSource.close();
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsStreaming(false);
    }
  };

  const selectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  const createConversation = async () => {
    try {
      const response = await api.post("/api/v1/knowledge-base/conversations", {
        title: "New Conversation",
        filter_context: filters,
      });
      setConversations((prev) => [response.data, ...prev]);
      setActiveConversation(response.data.id);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    conversations,
    activeConversation,
    messages,
    filters,
    isStreaming,
    sendMessage,
    selectConversation,
    createConversation,
    updateFilters,
    loadConversations,
  };
}
```

### Chat Area Component

```tsx
// frontend/src/components/KnowledgeBaseChatArea.tsx

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { StreamingIndicator } from "./StreamingIndicator";
import { Send } from "lucide-react";
import { ChatMessage, SearchFilters } from "@/types/knowledgeBase";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  filters: SearchFilters;
}

export function KnowledgeBaseChatArea({
  messages,
  isStreaming,
  onSendMessage,
  filters,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      onSendMessage(input);
      setInput("");
    }
  };

  const activeFiltersCount =
    filters.projects.length +
    filters.tags.length +
    (filters.dateRange.from ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        {activeFiltersCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}{" "}
            active
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2">
              Ask me anything about your meetings
            </h2>
            <p className="text-muted-foreground max-w-md">
              I can help you find information from transcripts, summaries,
              action items, decisions, and more.
            </p>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <UserMessage key={message.id} message={message} />
            ) : (
              <AssistantMessage key={message.id} message={message} />
            )
          )
        )}
        {isStreaming && <StreamingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your meetings..."
            className="flex-1 min-h-[60px] max-h-[200px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### Message Components

```tsx
// frontend/src/components/AssistantMessage.tsx

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSource } from "./MessageSource";
import { ChatMessage } from "@/types/knowledgeBase";
import { Bot } from "lucide-react";

interface Props {
  message: ChatMessage;
}

export function AssistantMessage({ message }: Props) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1 space-y-2">
        <Card className="p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {message.content}
          </div>
        </Card>
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              Sources:
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <MessageSource key={idx} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/components/MessageSource.tsx

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSource as MessageSourceType } from "@/types/knowledgeBase";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  source: MessageSourceType;
}

export function MessageSource({ source }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/meetings/${source.meetingId}`);
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case "transcription":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "summary":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "action_item":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "decision":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-auto p-2 flex items-start gap-2"
      onClick={handleClick}
    >
      <div className="flex flex-col items-start gap-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate max-w-[150px]">
            {source.meetingTitle}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] ${getContentTypeColor(source.contentType)}`}
          >
            {source.contentType}
          </Badge>
        </div>
        {source.relevanceScore && (
          <span className="text-[10px] text-muted-foreground">
            {Math.round(source.relevanceScore * 100)}% relevant
          </span>
        )}
      </div>
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
    </Button>
  );
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Setup & Infrastructure (Week 1-2)

- [ ] Install & configure Elasticsearch
- [ ] Create Elasticsearch index with mappings
- [ ] Set up embedding model (sentence-transformers)
- [ ] Create MongoDB collections (conversations, chat_messages)
- [ ] Write Elasticsearch service layer
- [ ] Write embedding generation service

### Phase 2: Backend Core (Week 3-4)

- [ ] Implement hybrid search algorithm
- [ ] Create indexing pipeline (Celery task)
- [ ] Implement RAG prompt builder
- [ ] Create chat streaming endpoint
- [ ] Implement conversation CRUD
- [ ] Write comprehensive tests

### Phase 3: Frontend Core (Week 5-6)

- [ ] Create page layout
- [ ] Build sidebar with filters
- [ ] Implement chat area
- [ ] Create message components
- [ ] Add streaming support (EventSource)
- [ ] Implement conversation management

### Phase 4: Integration & Polish (Week 7-8)

- [ ] Connect frontend to backend
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Add keyboard shortcuts
- [ ] Mobile responsive design
- [ ] Performance optimization

### Phase 5: Testing & Launch (Week 9-10)

- [ ] End-to-end testing
- [ ] Load testing
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Deployment

---

## 🧪 Testing Strategy

### Unit Tests

```python
# backend/tests/unit/services/test_elasticsearch_service.py

@pytest.mark.asyncio
class TestElasticsearchService:

    async def test_hybrid_search_semantic_only(self):
        """Test semantic search component."""
        pass

    async def test_hybrid_search_keyword_only(self):
        """Test keyword search component."""
        pass

    async def test_hybrid_search_combined(self):
        """Test combined hybrid search."""
        pass

    async def test_search_with_filters(self):
        """Test search with project/tag/date filters."""
        pass
```

### Integration Tests

```python
# backend/tests/integration/test_knowledge_base_flow.py

@pytest.mark.asyncio
async def test_complete_knowledge_base_flow(client: AsyncClient, db):
    """Test complete flow: index → search → chat."""

    # 1. Create and index meeting
    # 2. Search for content
    # 3. Send chat message
    # 4. Verify response includes sources
    pass
```

### Frontend Tests

```tsx
// frontend/src/pages/KnowledgeBasePage.test.tsx

describe("KnowledgeBasePage", () => {
  it("renders empty state initially", () => {});
  it("sends message and receives response", async () => {});
  it("displays sources correctly", () => {});
  it("filters conversations by project", () => {});
});
```

---

## 📊 Performance Considerations

### Backend

- **Elasticsearch Query Time**: Target <200ms for 90th percentile
- **Embedding Generation**: Cache embeddings, ~50ms per query
- **Streaming Latency**: First token <500ms, subsequent <50ms
- **Concurrent Users**: Support 100+ concurrent chat sessions

### Frontend

- **Initial Load**: <2s for page load
- **Message Rendering**: 60fps smooth scrolling
- **Streaming Display**: Real-time (no buffering)
- **Filter Updates**: Debounced search (300ms)

### Optimization Strategies

1. **Elasticsearch**:
   - Use index aliases for zero-downtime updates
   - Implement query caching
   - Optimize shard allocation
2. **Caching**:
   - Redis cache for frequent queries
   - Browser cache for conversations
3. **Pagination**:
   - Load conversations on-demand (infinite scroll)
   - Limit message history to last 50

---

## 🔒 Security Considerations

### Data Access

- **Row-Level Security**: Users can only search their own meetings
- **Project Permissions**: Respect project member lists
- **Conversation Isolation**: Users can't access others' chats

### Input Validation

- **Query Length**: Max 500 characters
- **Rate Limiting**: 10 requests/minute per user
- **XSS Protection**: Sanitize all user inputs

### Privacy

- **Data Retention**: Conversations kept for 90 days
- **Export Option**: Allow users to download chat history
- **Deletion**: Cascade delete on meeting deletion

---

## 📝 User Stories

### US-1: Basic Search

```
As a user
I want to ask questions about my meetings
So that I can quickly find information without reading transcripts
```

**Acceptance Criteria:**

- [ ] User can type natural language questions
- [ ] System returns relevant answers with sources
- [ ] Response time <3 seconds

### US-2: Filter by Project

```
As a user
I want to filter knowledge base by project
So that I can focus on specific project contexts
```

**Acceptance Criteria:**

- [ ] User can select multiple projects
- [ ] Filters persist during conversation
- [ ] Clear indication of active filters

### US-3: Conversation History

```
As a user
I want to see my previous conversations
So that I can continue where I left off
```

**Acceptance Criteria:**

- [ ] Sidebar shows recent conversations
- [ ] Clicking conversation loads messages
- [ ] Delete conversation option available

---

## 🎯 Success Metrics

### Quantitative

- **Adoption Rate**: 70% of users try Knowledge Base within first week
- **Engagement**: Average 5+ queries per user per week
- **Satisfaction**: 4.5/5 rating
- **Performance**: 95% of queries <2s response time

### Qualitative

- Users find answers faster than manual search
- Reduces support tickets about "where is X information"
- Positive feedback on answer relevance

---

## 🔄 Future Enhancements

### V2 Features

- [ ] Multi-modal search (search by audio snippet)
- [ ] Collaborative conversations (share chat with team)
- [ ] Smart suggestions (auto-complete questions)
- [ ] Export chat as PDF/Markdown
- [ ] Voice input for queries

### V3 Features

- [ ] Meeting recommendation engine
- [ ] Proactive insights ("You asked about X, related info found in...")
- [ ] Integration with external tools (Slack, Teams)
- [ ] Advanced analytics (topic trends, sentiment)

---

## 📚 References

### Technologies

- **Elasticsearch**: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
- **Hybrid Search**: https://www.elastic.co/blog/semantic-search-elasticsearch
- **RAG Pattern**: https://www.promptingguide.ai/techniques/rag
- **Ollama**: https://ollama.ai/
- **FastAPI Streaming**: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse

### Design Inspiration

- ChatGPT interface
- Notion AI
- Perplexity AI

---

## ✅ Definition of Done

Feature is considered complete when:

- [ ] All API endpoints implemented and tested (>80% coverage)
- [ ] Frontend components built and tested
- [ ] Elasticsearch indexes created and optimized
- [ ] Hybrid search working with good relevance
- [ ] Streaming chat functional
- [ ] Filters working correctly
- [ ] Mobile responsive
- [ ] Documentation complete
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] User acceptance testing passed

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-01  
**Author**: Meeting Synthesis Team  
**Status**: 📋 Specification (Not Implemented)
