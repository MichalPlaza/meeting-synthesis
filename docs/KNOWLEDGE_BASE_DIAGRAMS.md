# Knowledge Base - Architecture Diagrams

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend - React"
        A[User Browser] --> B[KnowledgeBasePage]
        B --> C[Chat Area]
        B --> D[Sidebar + Filters]
        C --> E[Message Components]
        C --> F[Input Area]
    end

    subgraph "Backend - FastAPI"
        G[API Gateway] --> H[Knowledge Base API]
        H --> I[Search Service]
        H --> J[Chat Service]
        H --> K[Indexing Service]

        I --> L[Elasticsearch Service]
        J --> M[Ollama Service]
        K --> L
        K --> N[Embedding Service]
    end

    subgraph "Data Stores"
        O[(Elasticsearch)]
        P[(MongoDB)]
        Q[(Redis)]
    end

    subgraph "ML Services"
        R[Sentence Transformers]
        S[Ollama LLM]
    end

    F -->|WebSocket/SSE| G
    L --> O
    J --> P
    N --> R
    M --> S
    K --> Q

    style A fill:#e1f5ff
    style G fill:#fff4e1
    style O fill:#f0e1ff
    style P fill:#f0e1ff
    style R fill:#e1ffe1
    style S fill:#e1ffe1
```

## Data Flow - User Query

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as FastAPI
    participant ES as Elasticsearch
    participant EMB as Embedding Service
    participant OLL as Ollama
    participant DB as MongoDB

    U->>F: Types question
    F->>API: POST /knowledge-base/chat

    Note over API: Step 1: Search
    API->>EMB: Generate query embedding
    EMB-->>API: Embedding vector [384]
    API->>ES: Hybrid search (semantic + keyword)
    ES-->>API: Top-K relevant documents

    Note over API: Step 2: RAG
    API->>API: Build context from documents
    API->>OLL: Stream chat completion

    loop Streaming Response
        OLL-->>API: Token chunk
        API-->>F: SSE: {content: "..."}
        F->>U: Display chunk (typewriter)
    end

    OLL-->>API: Complete
    API-->>F: SSE: {sources: [...]}
    F->>U: Display sources

    Note over API: Step 3: Save
    API->>DB: Save message + sources
    DB-->>API: Saved
```

## Hybrid Search Flow

```mermaid
graph LR
    A[User Query] --> B[Generate Embedding]
    A --> C[Tokenize Text]

    B --> D[Semantic Search<br/>KNN + Cosine Similarity]
    C --> E[Keyword Search<br/>BM25]

    D --> F{Combine Scores}
    E --> F

    F --> G[Apply Filters<br/>Project/Tags/Dates]
    G --> H[Re-rank Results]
    H --> I[Top-K Documents]

    style D fill:#e1f5ff
    style E fill:#ffe1e1
    style F fill:#fff4e1
```

## Indexing Pipeline

```mermaid
graph TB
    A[Meeting Processed] --> B{Processing Complete?}
    B -->|Yes| C[Celery Task: index_meeting]

    C --> D[Extract Transcription]
    C --> E[Extract AI Analysis]

    D --> F[Generate Embedding]
    F --> G[Index to Elasticsearch]

    E --> H[Extract Summary]
    E --> I[Extract Topics]
    E --> J[Extract Action Items]
    E --> K[Extract Decisions]

    H --> L[Generate Embeddings<br/>Batch]
    I --> L
    J --> L
    K --> L

    L --> M[Bulk Index to ES]

    G --> N[Update Meeting Status]
    M --> N

    style C fill:#fff4e1
    style L fill:#e1ffe1
    style M fill:#e1f5ff
```

## Component Tree - Frontend

```mermaid
graph TB
    A[KnowledgeBasePage] --> B[KnowledgeBaseSidebar]
    A --> C[KnowledgeBaseChatArea]

    B --> D[FilterSection]
    B --> E[ConversationsList]

    D --> F[ProjectFilter]
    D --> G[TagFilter]
    D --> H[DateRangeFilter]

    E --> I[ConversationItem]

    C --> J[MessagesContainer]
    C --> K[InputArea]

    J --> L[UserMessage]
    J --> M[AssistantMessage]
    J --> N[StreamingIndicator]

    M --> O[MessageSource]
    M --> P[SourceDrawer]

    K --> Q[MessageInput]
    K --> R[SendButton]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#fff4e1
```

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : has
    USERS ||--o{ MEETINGS : owns
    CONVERSATIONS ||--o{ CHAT_MESSAGES : contains
    MEETINGS ||--o{ ELASTICSEARCH_DOCS : indexed_as

    USERS {
        ObjectId _id PK
        string username
        string email
        string hashed_password
        datetime created_at
    }

    CONVERSATIONS {
        ObjectId _id PK
        ObjectId user_id FK
        string title
        object filter_context
        datetime created_at
        datetime updated_at
    }

    CHAT_MESSAGES {
        ObjectId _id PK
        ObjectId user_id FK
        ObjectId conversation_id FK
        string role
        string content
        array sources
        datetime created_at
    }

    MEETINGS {
        ObjectId _id PK
        ObjectId uploader_id FK
        ObjectId project_id FK
        string title
        datetime meeting_datetime
        object transcription
        object ai_analysis
        array tags
    }

    ELASTICSEARCH_DOCS {
        string _id PK
        string meeting_id
        string project_id
        string user_id
        string title
        text content
        string content_type
        array tags
        datetime meeting_datetime
        array-384 embedding
        object metadata
    }
```

## State Management - Frontend

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> Loading : Page Load
    Loading --> Ready : Data Loaded

    Ready --> Searching : User Types Query
    Searching --> Streaming : Results Found
    Streaming --> Ready : Response Complete

    Searching --> Error : Search Failed
    Error --> Ready : Retry

    Ready --> FilterChange : User Changes Filters
    FilterChange --> Ready : Filters Applied

    Ready --> ConversationSwitch : User Selects Conversation
    ConversationSwitch --> Loading : Load Messages
    Loading --> Ready : Messages Loaded

    note right of Streaming
        Displaying tokens
        in real-time
    end note

    note right of FilterChange
        Re-applies filters
        to search context
    end note
```

## API Endpoints Structure

```mermaid
graph LR
    A["/api/v1/knowledge-base"] --> B["/search"]
    A --> C["/chat"]
    A --> D["/conversations"]
    A --> E["/index"]

    B --> B1["POST: Hybrid Search"]

    C --> C1["POST: Stream Chat<br/>(Server-Sent Events)"]

    D --> D1["GET: List Conversations"]
    D --> D2["POST: Create Conversation"]
    D --> D3["DELETE: /{id}"]
    D --> D4["GET: /{id}/messages"]

    E --> E1["POST: Index Meeting<br/>(Background Task)"]
    E --> E2["DELETE: /{meeting_id}"]

    style B1 fill:#e1f5ff
    style C1 fill:#fff4e1
    style E1 fill:#e1ffe1
```

## Elasticsearch Index Structure

```mermaid
graph TB
    A[meetings_knowledge_base<br/>Index] --> B[Mappings]
    A --> C[Settings]

    B --> D[Properties]

    D --> E[meeting_id<br/>keyword]
    D --> F[project_id<br/>keyword]
    D --> G[user_id<br/>keyword]
    D --> H[title<br/>text + keyword]
    D --> I[content<br/>text]
    D --> J[content_type<br/>keyword]
    D --> K[tags<br/>keyword array]
    D --> L[meeting_datetime<br/>date]
    D --> M[embedding<br/>dense_vector 384]
    D --> N[metadata<br/>object]

    C --> O[Shards: 1]
    C --> P[Replicas: 0]
    C --> Q[Analyzers]

    style M fill:#e1ffe1
    style J fill:#ffe1e1
```

## Performance Optimization Flow

```mermaid
graph TB
    A[User Query] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached]
    B -->|No| D[Execute Search]

    D --> E[Elasticsearch Query]
    E --> F{Result Count}

    F -->|< 10| G[Return All]
    F -->|> 10| H[Apply Re-ranking]

    H --> I[Top-K Selection]
    I --> J[Cache Results]
    J --> G

    G --> K[Generate Response]
    K --> L{Streaming?}
    L -->|Yes| M[Stream Tokens]
    L -->|No| N[Return Full]

    style B fill:#fff4e1
    style J fill:#e1ffe1
```

## Security & Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant Auth as Auth Service
    participant KB as Knowledge Base API
    participant ES as Elasticsearch

    U->>F: Login
    F->>Auth: POST /auth/login
    Auth-->>F: JWT Token
    F->>F: Store token

    U->>F: Ask question
    F->>KB: POST /chat<br/>Header: Bearer {token}
    KB->>Auth: Verify token
    Auth-->>KB: User ID

    Note over KB: Filter by user_id
    KB->>ES: Search with user_id filter
    ES-->>KB: Only user's documents

    KB-->>F: Response
    F->>U: Display answer
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Network"
        A[Nginx<br/>:80] --> B[Frontend<br/>React :5173]
        A --> C[Backend<br/>FastAPI :8000]

        C --> D[MongoDB<br/>:27017]
        C --> E[Redis<br/>:6379]
        C --> F[Elasticsearch<br/>:9200]
        C --> G[Ollama<br/>:11434]

        H[Celery Worker] --> E
        H --> D
        H --> F

        I[Celery Beat] --> E

        J[Notification Service<br/>:8001] --> E
    end

    K[External User] --> A

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style F fill:#e1ffe1
    style G fill:#e1ffe1
```

## Testing Strategy

```mermaid
graph TB
    A[Code Changes] --> B[Unit Tests]
    B --> C{Pass?}
    C -->|No| A
    C -->|Yes| D[Integration Tests]

    D --> E{Pass?}
    E -->|No| A
    E -->|Yes| F[E2E Tests]

    F --> G{Pass?}
    G -->|No| A
    G -->|Yes| H[Code Review]

    H --> I{Approved?}
    I -->|No| A
    I -->|Yes| J[Merge to Main]

    J --> K[CI/CD Pipeline]
    K --> L[Deploy to Staging]
    L --> M[Smoke Tests]
    M --> N{Pass?}
    N -->|No| O[Rollback]
    N -->|Yes| P[Deploy to Production]

    style B fill:#e1f5ff
    style D fill:#fff4e1
    style F fill:#ffe1e1
    style P fill:#e1ffe1
```

---

## How to Use These Diagrams

### In Documentation

Copy the Mermaid code blocks into Markdown files. GitHub and many Markdown viewers render them automatically.

### In VS Code

Install the "Markdown Preview Mermaid Support" extension to preview diagrams.

### Online Editor

Use [Mermaid Live Editor](https://mermaid.live/) to edit and export as PNG/SVG.

### In Presentations

Export as images and use in slides or documentation.

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-01  
**Tools**: Mermaid.js for diagram generation
