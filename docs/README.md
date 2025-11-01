# 📚 Dokumentacja Meeting Synthesis

Witaj w folderze dokumentacji projektu Meeting Synthesis!

## 🗂️ Zawartość

### 📋 Knowledge Base (Planowana Funkcja)

Kompleksowa dokumentacja dla funkcji Knowledge Base - zaawansowanego interfejsu czatowego do przeszukiwania meetingów.

| Dokument                                                                         | Opis                                                 | Rozmiar |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- | ------- |
| **[README_KNOWLEDGE_BASE.md](./README_KNOWLEDGE_BASE.md)**                       | 🚀 **ZACZNIJ TUTAJ!** Przegląd wszystkich dokumentów | ~100KB  |
| [KNOWLEDGE_BASE_SPEC.md](./KNOWLEDGE_BASE_SPEC.md)                               | 📋 Pełna specyfikacja techniczna (120+ stron)        | ~500KB  |
| [KNOWLEDGE_BASE_UI_EXAMPLES.md](./KNOWLEDGE_BASE_UI_EXAMPLES.md)                 | 🎨 Mockupy UI/UX i przykłady interakcji              | ~150KB  |
| [KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md](./KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md) | 🚀 Krok po kroku plan z kodem (TDD)                  | ~300KB  |
| [KNOWLEDGE_BASE_DIAGRAMS.md](./KNOWLEDGE_BASE_DIAGRAMS.md)                       | 📊 Diagramy architektury (Mermaid)                   | ~80KB   |

---

## 🎯 Quick Start

### Dla Planowania Funkcji

```bash
# 1. Przeczytaj przegląd
open docs/README_KNOWLEDGE_BASE.md

# 2. Zrozum architekturę i wymagania
open docs/KNOWLEDGE_BASE_SPEC.md

# 3. Zobacz mockupy UI
open docs/KNOWLEDGE_BASE_UI_EXAMPLES.md
```

### Dla Implementacji

```bash
# 1. Przejdź do planu implementacji
open docs/KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md

# 2. Zacznij od Task 1.1.1: Elasticsearch Setup
cd backend
# Follow step-by-step instructions...
```

### Dla Zrozumienia Architektury

```bash
# 1. Zobacz diagramy
open docs/KNOWLEDGE_BASE_DIAGRAMS.md

# 2. Przeanalizuj flow danych
# Sprawdź: Data Flow - User Query diagram
```

---

## 📖 Jak Czytać Dokumentację?

### 🎭 Według Roli

#### Product Manager / Business

➡️ Zacznij od: `README_KNOWLEDGE_BASE.md` → `KNOWLEDGE_BASE_UI_EXAMPLES.md`

- Zrozum funkcjonalność i user experience
- Zobacz mockupy i flow użytkownika
- Sprawdź success metrics i user stories

#### Developer (Backend)

➡️ Zacznij od: `KNOWLEDGE_BASE_SPEC.md` (Backend section) → `KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md`

- API endpoints i data models
- Hybrid search implementation
- RAG pattern z Ollama
- Krok po kroku kod z testami

#### Developer (Frontend)

➡️ Zacznij od: `KNOWLEDGE_BASE_UI_EXAMPLES.md` → `KNOWLEDGE_BASE_SPEC.md` (Frontend section)

- Komponenty i layout
- State management
- Streaming implementation
- Accessibility features

#### Architect / Tech Lead

➡️ Zacznij od: `KNOWLEDGE_BASE_DIAGRAMS.md` → `KNOWLEDGE_BASE_SPEC.md` (Architecture)

- Diagramy systemu
- Tech stack decisions
- Performance considerations
- Security patterns

#### QA / Tester

➡️ Zacznij od: `KNOWLEDGE_BASE_SPEC.md` (Testing Strategy) → `KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md`

- Test scenarios
- TDD approach
- Integration tests
- E2E test cases

---

## 🏗️ Knowledge Base - Krótki Przegląd

### Czym Jest?

Interfejs czatowy wykorzystujący **Elasticsearch hybrid search** i **RAG** do inteligentnego przeszukiwania wszystkich materiałów z meetingów.

### Kluczowe Technologie

- **Elasticsearch 8.x** - Hybrid search (semantic + keyword)
- **Sentence Transformers** - Embeddings (all-MiniLM-L6-v2)
- **Ollama + Llama 3.1** - Lokalne LLM dla RAG
- **FastAPI** - Streaming API
- **React + TypeScript** - Chat UI

### Główne Cechy

- 💬 Pytania w języku naturalnym
- 🔍 Hybrid search (embeddings + BM25)
- 🤖 AI odpowiedzi z faktycznymi danymi
- 📊 Filtry (projekty, tagi, daty)
- 💾 Historia konwersacji
- 🔗 Źródła w odpowiedziach
- ⚡ Real-time streaming

### Status

🚧 **W Fazie Planowania** - Dokumentacja gotowa, implementacja ~9 tygodni

---

## 📊 Statystyki Dokumentacji

```
Dokumenty Knowledge Base:
├─ README_KNOWLEDGE_BASE.md      (~100KB) ✅ Complete
├─ KNOWLEDGE_BASE_SPEC.md        (~500KB) ✅ Complete
├─ KNOWLEDGE_BASE_UI_EXAMPLES.md (~150KB) ✅ Complete
├─ KNOWLEDGE_BASE_IMPL_PLAN.md   (~300KB) ✅ Complete
└─ KNOWLEDGE_BASE_DIAGRAMS.md    (~80KB)  ✅ Complete

Total: ~1.1MB dokumentacji
Lines: ~4000+
Code Examples: 100+
Diagrams: 15+ (Mermaid)
```

---

## 🎓 Dodatkowe Zasoby

### Learning Resources

- [Elasticsearch Semantic Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html)
- [RAG Pattern Explained](https://python.langchain.com/docs/use_cases/question_answering/)
- [Sentence Transformers Docs](https://www.sbert.net/)
- [Ollama Documentation](https://ollama.ai/docs)

### Project Guidelines

- [Meeting Synthesis Instructions](../.github/instructions/meeting-synthesis.instructions.md)
- [Main README](../README.md)
- [Backend README](../backend/README.md)
- [Frontend README](../frontend/README.md)

---

## 🤝 Contributing

### Dodawanie Nowej Dokumentacji

1. Utwórz nowy plik w formacie Markdown
2. Użyj spójnego formatowania (headings, code blocks, tables)
3. Dodaj link w tym README
4. Update table of contents

### Aktualizacja Istniejącej Dokumentacji

1. Edytuj odpowiedni plik
2. Zaktualizuj "Last Updated" date
3. Zwiększ numer wersji jeśli znaczące zmiany
4. Dodaj changelog entry jeśli istnieje

---

## 📞 Questions?

Jeśli masz pytania dotyczące dokumentacji:

1. Sprawdź **README_KNOWLEDGE_BASE.md** - zawiera FAQ i common issues
2. Przejrzyj **Implementation Plan** - step-by-step guidance
3. Zobacz **Diagrams** - wizualna reprezentacja
4. Otwórz issue w repozytorium

---

## 📝 Document Versions

| Dokument                              | Wersja | Data       | Status     |
| ------------------------------------- | ------ | ---------- | ---------- |
| README.md (ten plik)                  | 1.0    | 2025-11-01 | ✅ Current |
| README_KNOWLEDGE_BASE.md              | 1.0    | 2025-11-01 | ✅ Current |
| KNOWLEDGE_BASE_SPEC.md                | 1.0    | 2025-11-01 | ✅ Current |
| KNOWLEDGE_BASE_UI_EXAMPLES.md         | 1.0    | 2025-11-01 | ✅ Current |
| KNOWLEDGE_BASE_IMPLEMENTATION_PLAN.md | 1.0    | 2025-11-01 | ✅ Current |
| KNOWLEDGE_BASE_DIAGRAMS.md            | 1.0    | 2025-11-01 | ✅ Current |

---

**Last Updated:** 2025-11-01  
**Maintained by:** Meeting Synthesis Team  
**Project:** [Meeting Synthesis](https://github.com/mplazax/meeting-syntesis)
