# 📚 Knowledge Base - Dokumentacja

## 🎯 Przegląd

Ten folder zawiera **kompletną dokumentację** funkcji Knowledge Base - interfejsu czatowego do przeszukiwania wszystkich materiałów z meetingów za pomocą **Elasticsearch hybrid search** i **RAG (Retrieval-Augmented Generation)**.

---

## 📄 Dostępne Dokumenty

### 1. 📋 [KNOWLEDGE_BASE_SPEC.md](./KNOWLEDGE_BASE_SPEC.md)

**Specyfikacja Funkcjonalna** - 120+ stron szczegółowej dokumentacji

**Zawiera:**

- Przegląd architektury (Backend, Frontend, Data Flow)
- Struktury danych (Elasticsearch, MongoDB, TypeScript)
- Schemat UI/UX z ASCII mockupami
- Implementację backend (API endpoints, hybrid search, RAG)
- Implementację frontend (React components, hooks, streaming)
- Plan implementacji (roadmap 10 tygodni)
- Strategię testowania (TDD approach)
- Metryki wydajności i bezpieczeństwa
- User stories i success metrics

**Kiedy używać:**

- Rozpoczynając implementację od zera
- Potrzebujesz zrozumieć całościową architekturę
- Projektowanie API lub struktury danych
- Planowanie testów

---

### 2. 🎨 [KNOWLEDGE_BASE_UI_EXAMPLES.md](./KNOWLEDGE_BASE_UI_EXAMPLES.md)

**Przykłady UI/UX** - Wizualne mockupy i animacje

**Zawiera:**

- ASCII art mockupy wszystkich stanów ekranu
- Przykłady interakcji użytkownika
- Definicje animacji i transitions
- Komponenty wiadomości (styled)
- Filtry i ich stany
- Responsywne layouty (mobile/desktop)
- Accessibility features
- Keyboard shortcuts

**Kiedy używać:**

- Projektowanie komponentów frontend
- Implementacja CSS/Tailwind
- Sprawdzanie flow użytkownika
- Planowanie animacji

---

### 3. 🚀 [KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md](./KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md)

**Plan Implementacji** - Krok po kroku z TDD

**Zawiera:**

- Podział na 7 faz (infrastructure → testing)
- Mikro-zadania z kodem (copy-paste ready)
- Testy dla każdego zadania (TDD approach)
- Docker setup dla Elasticsearch
- Embedding service implementation
- Hybrid search algorithm
- Progress tracking checklist

**Kiedy używać:**

- Rozpoczynanie implementacji
- Potrzebujesz konkretnego kodu do skopiowania
- Szukasz testów do napisania
- Tracking progress

---

## 🏗️ Architektura High-Level

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                         │
│              React 19 + TypeScript                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Chat API   │  │  Search API  │  │  Index API   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
│         │   ┌─────────────▼──────────────┐   │          │
│         │   │  Elasticsearch Service     │   │          │
│         │   │  - Hybrid Search           │   │          │
│         │   │  - Semantic (KNN)          │   │          │
│         │   │  - Keyword (BM25)          │   │          │
│         │   └────────────────────────────┘   │          │
│         │                                     │          │
│         │   ┌─────────────────────────────┐  │          │
│         └──▶│   Ollama Service (RAG)      │  │          │
│             │   - Prompt Builder          │  │          │
│             │   - Streaming Response      │  │          │
│             └─────────────────────────────┘  │          │
│                                                │          │
│   ┌────────────────────────────────┐          │          │
│   │  Embedding Service             │◀─────────┘          │
│   │  - Sentence Transformers       │                     │
│   │  - all-MiniLM-L6-v2 (384 dim) │                     │
│   └────────────────────────────────┘                     │
└────────────┬───────────────────────────┬─────────────────┘
             │                           │
             ▼                           ▼
   ┌──────────────────┐      ┌──────────────────────┐
   │  Elasticsearch   │      │      MongoDB         │
   │                  │      │                      │
   │  - Embeddings    │      │  - Conversations     │
   │  - Text Content  │      │  - Chat Messages     │
   │  - Metadata      │      │  - Meetings          │
   └──────────────────┘      └──────────────────────┘
```

---

## 🎯 Quick Start

### 1. Przeczytaj specyfikację

```bash
# Zacznij od głównej specyfikacji
open docs/KNOWLEDGE_BASE_SPEC.md
```

### 2. Zobacz przykłady UI

```bash
# Sprawdź mockupy i flow
open docs/KNOWLEDGE_BASE_UI_EXAMPLES.md
```

### 3. Rozpocznij implementację

```bash
# Przejdź do planu krok po kroku
open docs/KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md

# Zacznij od Task 1.1.1: Setup Elasticsearch
```

---

## 📊 Tech Stack

### Backend

- **FastAPI** - API framework
- **Elasticsearch 8.x** - Hybrid search engine
- **Sentence Transformers** - Embedding generation (all-MiniLM-L6-v2)
- **Ollama** - Local LLM (llama3.1:8b)
- **MongoDB** - Metadata storage
- **Motor** - Async MongoDB driver
- **Celery** - Background task processing

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **EventSource** - Server-Sent Events for streaming

### Infrastructure

- **Docker & Docker Compose** - Containerization
- **Redis** - Caching & message broker

---

## 🔑 Kluczowe Koncepcje

### Hybrid Search

Łączy dwa podejścia:

1. **Semantic Search (KNN)**

   - Użycie embeddings (384-wymiarowe wektory)
   - Cosine similarity między query a dokumentami
   - Świetne dla pytań w języku naturalnym

2. **Keyword Search (BM25)**
   - Tradycyjne wyszukiwanie tekstowe
   - Dopasowanie słów kluczowych
   - Świetne dla konkretnych terminów

**Rezultat:** Połączenie obu metod daje najlepsze wyniki!

### RAG (Retrieval-Augmented Generation)

```
User Query → Hybrid Search → Top-K Documents → Build Context → LLM → Answer
```

1. User zadaje pytanie
2. System znajduje relevantne dokumenty (hybrid search)
3. Tworzy kontekst z top-K wyników
4. Przesyła do LLM z instrukcjami
5. LLM generuje odpowiedź na podstawie kontekstu
6. Zwraca odpowiedź + źródła

### Streaming Response

- Server-Sent Events (EventSource)
- Real-time typewriter effect
- Źródła wysyłane po zakończeniu generowania

---

## 📈 Implementation Phases

| Faza                    | Tydzień | Zadania                             | Status  |
| ----------------------- | ------- | ----------------------------------- | ------- |
| **1-2: Infrastructure** | 1-2     | Elasticsearch, Embeddings, Indexing | ⏳ TODO |
| **3: Backend Core**     | 3-4     | Models, CRUD, Hybrid Search         | ⏳ TODO |
| **4: RAG & Streaming**  | 5       | Ollama integration, API endpoints   | ⏳ TODO |
| **5: Frontend Base**    | 6       | Components, Layout                  | ⏳ TODO |
| **6: Integration**      | 7       | Hooks, API calls, Streaming         | ⏳ TODO |
| **7: Testing**          | 8-9     | Unit, Integration, E2E tests        | ⏳ TODO |

**Total Estimate:** ~9 tygodni

---

## ✅ Implementation Checklist

### Phase 1-2: Infrastructure

- [ ] Elasticsearch Docker setup
- [ ] Index mapping created
- [ ] Embedding service (Sentence Transformers)
- [ ] Indexing pipeline (Celery task)
- [ ] Unit tests for embedding & indexing

### Phase 3-4: Backend

- [ ] MongoDB models (Conversation, ChatMessage)
- [ ] CRUD operations
- [ ] Hybrid search implementation
- [ ] RAG prompt builder
- [ ] Streaming endpoint
- [ ] API tests >80% coverage

### Phase 5-6: Frontend

- [ ] Page layout
- [ ] Sidebar with filters
- [ ] Chat area with messages
- [ ] Message components (User/Assistant)
- [ ] Streaming UI (EventSource)
- [ ] State management (hooks)

### Phase 7: Testing & Polish

- [ ] Integration tests
- [ ] E2E tests (Playwright/Cypress)
- [ ] Performance optimization
- [ ] Mobile responsive
- [ ] Accessibility (ARIA, keyboard shortcuts)
- [ ] Documentation complete

---

## 🎓 Learning Resources

### Elasticsearch

- [Elastic Guide - Semantic Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html)
- [Hybrid Search Tutorial](https://www.elastic.co/blog/improving-information-retrieval-elastic-stack-hybrid)

### RAG Pattern

- [LangChain RAG Tutorial](https://python.langchain.com/docs/use_cases/question_answering/)
- [Ollama Documentation](https://ollama.ai/docs)

### Sentence Transformers

- [SBERT Documentation](https://www.sbert.net/)
- [Model: all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

### React Streaming

- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Server-Sent Events Guide](https://www.html5rocks.com/en/tutorials/eventsource/basics/)

---

## 🐛 Common Issues & Solutions

### Issue: Elasticsearch not starting

```bash
# Solution 1: Increase Docker memory
# Docker Desktop → Settings → Resources → Memory: 4GB+

# Solution 2: Check logs
docker logs meeting_synthesis_elasticsearch

# Solution 3: Clear data
docker volume rm meeting-syntesis_elasticsearch_data
```

### Issue: Embedding model download fails

```python
# Solution: Pre-download model
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
# Model cached in ~/.cache/torch/sentence_transformers/
```

### Issue: Streaming not working in browser

```javascript
// Solution: Check CORS and EventSource support
const eventSource = new EventSource(url);
eventSource.onerror = (error) => {
  console.error("EventSource error:", error);
};
```

### Issue: Search results not relevant

```python
# Solution 1: Adjust weights in hybrid search
"should": [
    {"script_score": {..., "boost": 1.5}},  # Increase semantic
    {"multi_match": {..., "boost": 0.8}}    # Decrease keyword
]

# Solution 2: Check embedding quality
embedding = await generate_embedding(query)
assert len(embedding) == 384  # Verify dimensions
```

---

## 🎯 Success Criteria

### Functionality

- ✅ User can ask questions in natural language
- ✅ System returns relevant answers with sources
- ✅ Filters work (projects, tags, dates)
- ✅ Conversation history saved
- ✅ Streaming works smoothly

### Performance

- ✅ Search response time <2s (90th percentile)
- ✅ First token latency <500ms
- ✅ UI smooth (60fps)
- ✅ Handles 100+ concurrent users

### Quality

- ✅ Test coverage >80%
- ✅ All linting passes
- ✅ Type checking passes
- ✅ No console errors
- ✅ Accessibility WCAG 2.1 AA

---

## 📞 Support & Questions

### Podczas implementacji

1. Przeczytaj odpowiednią sekcję w dokumentacji
2. Sprawdź przykłady kodu w Implementation Plan
3. Przejrzyj testy jednostkowe
4. Sprawdź Common Issues powyżej

### Development Guidelines

- **Zawsze pisz testy PRZED kodem** (TDD)
- **Używaj type hints** w Python
- **Używaj TypeScript** w frontend
- **Dokumentuj złożone funkcje** (docstrings)
- **Commituj często** z clear messages

---

## 📚 Document Versions

| Dokument                              | Wersja | Data       | Status      |
| ------------------------------------- | ------ | ---------- | ----------- |
| KNOWLEDGE_BASE_SPEC.md                | 1.0    | 2025-11-01 | ✅ Complete |
| KNOWLEDGE_BASE_UI_EXAMPLES.md         | 1.0    | 2025-11-01 | ✅ Complete |
| KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md | 1.0    | 2025-11-01 | ✅ Complete |
| README_KNOWLEDGE_BASE.md              | 1.0    | 2025-11-01 | ✅ Complete |

---

## 🚀 Next Steps

1. **Review all documents** - Przeczytaj wszystkie 3 dokumenty
2. **Setup environment** - Zainstaluj Elasticsearch
3. **Start with Phase 1** - Begin Task 1.1.1
4. **Follow TDD** - Write tests first!
5. **Track progress** - Update checklists
6. **Iterate** - Build incrementally

---

**Happy Coding! 🚀**

_Dokumentacja stworzona przez: Meeting Synthesis Team_  
_Data ostatniej aktualizacji: 2025-11-01_  
_Status projektu: 📋 Ready for Implementation_
