# Dokumentacja Funkcjonalności - Meeting Synthesis

> Kompletny przegląd wszystkich funkcjonalności systemu do analizy i zarządzania wiedzą ze spotkań.

## Spis Treści

1. [Przegląd Systemu](#1-przegląd-systemu)
2. [Autentykacja i Zarządzanie Użytkownikami](#2-autentykacja-i-zarządzanie-użytkownikami)
3. [Zarządzanie Projektami](#3-zarządzanie-projektami)
4. [Zarządzanie Spotkaniami](#4-zarządzanie-spotkaniami)
5. [Pipeline Przetwarzania Audio](#5-pipeline-przetwarzania-audio)
6. [Analiza AI](#6-analiza-ai)
7. [Knowledge Base (Baza Wiedzy)](#7-knowledge-base-baza-wiedzy)
8. [System Komentarzy](#8-system-komentarzy)
9. [Panel Administracyjny](#9-panel-administracyjny)
10. [Powiadomienia Real-time](#10-powiadomienia-real-time)
11. [API Reference](#11-api-reference)

---

## 1. Przegląd Systemu

Meeting Synthesis to aplikacja do inteligentnego zarządzania spotkaniami z wykorzystaniem AI. System przetwarza nagrania audio ze spotkań, tworzy transkrypcje, analizuje treść za pomocą LLM i buduje przeszukiwalną bazę wiedzy.

### Architektura

```
┌─────────────────┐     HTTP      ┌──────────────────────────────────────────┐
│   Frontend      │──────────────▶│          Backend API (FastAPI)           │
│   (React/TS)    │               │                                          │
└─────────────────┘               │  ┌─────────────┐  ┌──────────────────┐   │
        │                         │  │  MongoDB    │  │  Elasticsearch   │   │
        │ WebSocket               │  │  (dane)     │  │  (wyszukiwanie)  │   │
        ▼                         │  └─────────────┘  └──────────────────┘   │
┌─────────────────┐               │                                          │
│  Notification   │               │  ┌─────────────┐  ┌──────────────────┐   │
│    Service      │◀──Redis───────│  │   Redis     │  │     Ollama       │   │
└─────────────────┘     PubSub    │  │  (kolejka)  │  │  (lokalne LLM)   │   │
                                  │  └─────────────┘  └──────────────────┘   │
                                  │         │                                │
                                  │         ▼                                │
                                  │  ┌─────────────────────────────────┐     │
                                  │  │    Celery Workers               │     │
                                  │  │  - Transkrypcja (Whisper)       │     │
                                  │  │  - Analiza AI                   │     │
                                  │  │  - Indeksowanie                 │     │
                                  │  └─────────────────────────────────┘     │
                                  └──────────────────────────────────────────┘
```

### Stos Technologiczny

| Warstwa | Technologie |
|---------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Python 3.11+, FastAPI, Pydantic, Motor (async MongoDB) |
| Bazy danych | MongoDB 6.0, Redis 7, Elasticsearch 8.11 |
| AI/ML | OpenAI Whisper (faster-whisper), Ollama, Sentence Transformers |
| Kolejki | Celery z Redis jako broker |
| Konteneryzacja | Docker, Docker Compose |

---

## 2. Autentykacja i Zarządzanie Użytkownikami

### 2.1 Rejestracja i Logowanie

#### Rejestracja Użytkownika
- **Endpoint:** `POST /auth/register`
- **Rate limit:** 3 żądania/minutę
- **Wymagane pola:**
  - `username` - unikalna nazwa użytkownika
  - `email` - unikalny adres email
  - `password` - hasło (hashowane bcrypt)
  - `full_name` - pełna nazwa (opcjonalne)

#### Logowanie
- **Endpoint:** `POST /auth/login`
- **Rate limit:** 5 żądań/minutę
- **Zwraca:** JWT access token + refresh token
- **Czas życia tokenu:** Konfigurowalny (domyślnie 30 min access, 7 dni refresh)

#### Odświeżanie Tokenu
- **Endpoint:** `POST /auth/refresh-token`
- **Automatyczne odświeżanie** w frontend przy starcie aplikacji

### 2.2 Role Użytkowników

System implementuje hierarchię ról z różnymi uprawnieniami:

| Rola | Opis | Uprawnienia |
|------|------|-------------|
| `admin` | Administrator systemu | Pełny dostęp, zarządzanie użytkownikami |
| `project_manager` | Kierownik projektu | Zarządzanie projektami i zespołem |
| `scrum_master` | Scrum Master | Zarządzanie spotkaniami w projekcie |
| `developer` | Deweloper | Dostęp do przypisanych projektów |

### 2.3 System Zatwierdzania Użytkowników

Nowi użytkownicy wymagają zatwierdzenia przed uzyskaniem pełnego dostępu:

```
Rejestracja → is_approved: false → Zatwierdzenie przez managera → is_approved: true
```

**Flagi użytkownika:**
- `is_approved` - czy użytkownik ma dostęp do systemu
- `can_edit` - czy użytkownik może edytować dane (CRUD na spotkaniach/projektach)
- `manager_id` - ID przełożonego (dla hierarchii)

**Akcje na użytkownikach:**
| Akcja | Endpoint | Opis |
|-------|----------|------|
| Zatwierdzenie | `PATCH /users/{id}/approve` | Aktywuje konto użytkownika |
| Cofnięcie dostępu | `PATCH /users/{id}/revoke` | Dezaktywuje konto |
| Toggle edycji | `PATCH /users/{id}/toggle-edit` | Włącza/wyłącza uprawnienia edycji |

### 2.4 Zarządzanie Użytkownikami

- **Lista użytkowników:** `GET /users` (z opcjonalnym wyszukiwaniem)
- **Aktualny użytkownik:** `GET /users/me`
- **Aktualizacja:** `PUT /users/{id}`
- **Usunięcie:** `DELETE /users/{id}`
- **Użytkownicy managera:** `GET /users/by-manager/{manager_id}`
- **Lista managerów:** `GET /users/managers` (project_manager + admin)

---

## 3. Zarządzanie Projektami

### 3.1 Model Projektu

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;           // Właściciel projektu
  members_ids: string[];      // Lista członków
  created_at: datetime;
  updated_at: datetime;
}
```

### 3.2 Operacje CRUD

| Operacja | Endpoint | Opis |
|----------|----------|------|
| Tworzenie | `POST /project/` | Nowy projekt |
| Lista | `GET /project/` | Wszystkie projekty (z filtrowaniem) |
| Lista populated | `GET /project/populated` | Z danymi użytkowników |
| Szczegóły | `GET /project/{id}` | Pojedynczy projekt |
| Aktualizacja | `PUT /project/{id}` | Modyfikacja |
| Usunięcie | `DELETE /project/{id}` | Usunięcie |

### 3.3 Filtrowanie i Wyszukiwanie

**Parametry zapytania:**
- `query` - wyszukiwanie po nazwie
- `sort_by` - sortowanie (`newest`, `oldest`, `name`)

### 3.4 Projekty Użytkownika

- **Jako właściciel:** `GET /project/owner/{owner_id}`
- **Jako członek:** `GET /project/member/{member_id}`

---

## 4. Zarządzanie Spotkaniami

### 4.1 Model Spotkania

```typescript
interface Meeting {
  id: string;
  title: string;
  meeting_datetime: datetime;     // Data spotkania
  project_id: string;             // Powiązany projekt
  uploader_id: string;            // Kto wgrał
  uploaded_at: datetime;

  audio_file: {
    original_filename: string;
    storage_path_or_url: string;
    file_size_bytes: number;
    duration_seconds?: number;
    mime_type: string;
  };

  processing_config: {
    processing_mode_selected: "local" | "openai";
    language: string;             // np. "pl", "en"
  };

  processing_status: {
    current_stage: ProcessingStage;
    error_message?: string;
    completed_at?: datetime;
  };

  transcription?: {
    full_text: string;
  };

  ai_analysis?: AIAnalysis;       // Zobacz sekcję 6

  tags: string[];
  duration_seconds?: number;
  last_updated_at: datetime;
}
```

### 4.2 Statusy Przetwarzania

```
PENDING → QUEUED → TRANSCRIBING → ANALYZING → COMPLETED
                                      ↓
                                   FAILED
```

| Status | Opis |
|--------|------|
| `pending` | Oczekuje na przetworzenie |
| `queued` | W kolejce Celery |
| `transcribing` | Trwa transkrypcja Whisper |
| `analyzing` | Trwa analiza AI |
| `completed` | Zakończono pomyślnie |
| `failed` | Wystąpił błąd |

### 4.3 Operacje na Spotkaniach

#### Upload Spotkania z Plikiem Audio
```
POST /meetings/upload
Content-Type: multipart/form-data

- title: string (wymagane)
- meeting_datetime: datetime (wymagane)
- project_id: string (wymagane)
- uploader_id: string (wymagane)
- tags: string (opcjonalne, rozdzielone przecinkami)
- file: binary (wymagane, plik audio)
- processing_mode_selected: "local" | "openai" (domyślnie "local")
- language: string (domyślnie "pl")
```

#### Inne Operacje

| Operacja | Endpoint | Opis |
|----------|----------|------|
| Lista | `GET /meetings/` | Z filtrowaniem |
| Szczegóły | `GET /meetings/{id}` | Pojedyncze spotkanie |
| Aktualizacja | `PUT /meetings/{id}` | Pełna aktualizacja |
| Częściowa aktualizacja | `PATCH /meetings/{id}` | Pojedyncze pola |
| Usunięcie | `DELETE /meetings/{id}` | Usunięcie |
| Po projekcie | `GET /meetings/project/{project_id}` | Spotkania projektu |
| Pobierz audio | `GET /meetings/{id}/download` | Plik audio |

### 4.4 Filtrowanie Spotkań

**Parametry:**
- `query` - wyszukiwanie w tytule
- `project_ids[]` - filtr po projektach (multi-select)
- `tags[]` - filtr po tagach
- `sort_by` - sortowanie (`newest`, `oldest`)

### 4.5 Historia Zmian Spotkania

- **Endpoint:** `GET /meeting_history/{meeting_id}`
- Zwraca listę ostatnich zmian wprowadzonych do spotkania

### 4.6 Bezpieczeństwo

- **Autoryzacja dostępu:** Użytkownik musi być członkiem projektu spotkania
- **Admin bypass:** Administratorzy mają dostęp do wszystkich spotkań
- **Ochrona przed path traversal:** Sanityzacja nazw plików przy pobieraniu

---

## 5. Pipeline Przetwarzania Audio

### 5.1 Architektura Pipeline

```
Upload Audio
     │
     ▼
┌─────────────────────────────────────────┐
│           Celery Task Queue             │
│  (process_meeting_audio)                │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  FAZA 1: TRANSKRYPCJA                   │
│  - faster-whisper (lokalne)             │
│  - Obsługa wielu języków                │
│  - Wynik: pełny tekst transkrypcji      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  FAZA 2: ANALIZA AI                     │
│  - Tryb lokalny: Ollama (gemma2:2b)     │
│  - Tryb cloud: OpenAI GPT               │
│  - Wynik: summary, topics, actions...   │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  FAZA 3: INDEKSOWANIE                   │
│  - Elasticsearch                        │
│  - Embeddingi (sentence-transformers)   │
│  - Wyszukiwanie hybrydowe               │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  POWIADOMIENIE                          │
│  - Redis PubSub → Notification Service  │
│  - WebSocket → Frontend                 │
└─────────────────────────────────────────┘
```

### 5.2 Transkrypcja (Whisper)

**Technologia:** faster-whisper (zoptymalizowana implementacja)

**Cechy:**
- Lokalne przetwarzanie (prywatność)
- Obsługa wielu języków
- Automatyczne wykrywanie języka
- GPU/CPU acceleration

### 5.3 Tryby Przetwarzania AI

| Tryb | Model | Opis |
|------|-------|------|
| `local` | Ollama (gemma2:2b) | Lokalne przetwarzanie, pełna prywatność |
| `openai` | OpenAI GPT | Cloud, wyższa jakość analizy |

**Strategy Pattern:**
```python
strategy = AIAnalysisFactory.get_strategy(mode)  # "local" lub "openai"
result = await strategy.analyze(prompt)
```

---

## 6. Analiza AI

### 6.1 Struktura Analizy

```typescript
interface AIAnalysis {
  summary: string;              // Podsumowanie spotkania
  key_topics: KeyTopic[];       // Kluczowe tematy
  action_items: ActionItem[];   // Zadania do wykonania
  decisions_made: DecisionMade[]; // Podjęte decyzje
  mentioned_dates: MentionedDate[]; // Wspomniane daty
}
```

### 6.2 Kluczowe Tematy (Key Topics)

```typescript
interface KeyTopic {
  topic: string;        // Nazwa tematu
  description: string;  // Opis
  importance: "high" | "medium" | "low";
}
```

### 6.3 Zadania (Action Items)

```typescript
interface ActionItem {
  task: string;              // Opis zadania
  assignee?: string;         // Osoba odpowiedzialna
  deadline?: string;         // Termin
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
}
```

**Interaktywna edycja w UI:**
- Zmiana statusu zadania
- Edycja treści inline
- Dodawanie/usuwanie zadań

### 6.4 Decyzje (Decisions Made)

```typescript
interface DecisionMade {
  decision: string;     // Treść decyzji
  context?: string;     // Kontekst
  made_by?: string;     // Kto podjął
}
```

### 6.5 Wspomniane Daty

```typescript
interface MentionedDate {
  date: string;         // Data
  context: string;      // Kontekst wspomnienia
}
```

---

## 7. Knowledge Base (Baza Wiedzy)

### 7.1 Przegląd

Knowledge Base to zaawansowany interfejs czatowy wykorzystujący **RAG (Retrieval-Augmented Generation)** do inteligentnego przeszukiwania wszystkich materiałów ze spotkań.

### 7.2 Architektura RAG

```
Pytanie użytkownika
         │
         ▼
┌─────────────────────────────────────┐
│  1. GENEROWANIE EMBEDDINGU          │
│  - sentence-transformers            │
│  - Model: all-MiniLM-L6-v2          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. WYSZUKIWANIE HYBRYDOWE          │
│  - Semantic search (KNN + cosine)   │
│  - Keyword search (BM25)            │
│  - Filtry: projekt, tagi, daty      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. BUDOWANIE KONTEKSTU             │
│  - Top K wyników (domyślnie 5)      │
│  - Max context length: 4000 znaków  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  4. GENEROWANIE ODPOWIEDZI          │
│  - Ollama LLM (gemma2:2b)           │
│  - Streaming (SSE)                  │
│  - Cytowanie źródeł                 │
└─────────────────────────────────────┘
```

### 7.3 Wyszukiwanie Hybrydowe

System łączy dwie metody wyszukiwania:

| Metoda | Technologia | Opis |
|--------|-------------|------|
| Semantic | KNN + cosine similarity | Rozumienie znaczenia pytania |
| Keyword | BM25 | Tradycyjne wyszukiwanie słów kluczowych |

### 7.4 Konwersacje

#### Model Konwersacji
```typescript
interface Conversation {
  id: string;
  user_id: string;
  title: string;           // Auto-generowany przez AI
  created_at: datetime;
  updated_at: datetime;
  message_count: number;
}
```

#### Model Wiadomości
```typescript
interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources: MessageSource[];  // Źródła dla odpowiedzi asystenta
  created_at: datetime;
}
```

#### Źródła Odpowiedzi
```typescript
interface MessageSource {
  meeting_id: string;
  meeting_title: string;
  content_type: string;      // "transcription", "summary", "action_items"
  excerpt: string;           // Fragment treści
  relevance_score: number;   // Wynik trafności
  timestamp?: string;
}
```

### 7.5 Operacje na Konwersacjach

| Operacja | Endpoint | Opis |
|----------|----------|------|
| Nowa | `POST /api/v1/knowledge-base/conversations` | Tworzy konwersację |
| Lista | `GET /api/v1/knowledge-base/conversations` | Lista konwersacji użytkownika |
| Wiadomości | `GET /api/v1/knowledge-base/conversations/{id}/messages` | Historia wiadomości |
| Usuń | `DELETE /api/v1/knowledge-base/conversations/{id}` | Usuwa konwersację |

### 7.6 Chat API

```
POST /api/v1/knowledge-base/chat

{
  "conversation_id": "optional-id",  // Lub null dla nowej konwersacji
  "query": "Jakie decyzje podjęto na ostatnim spotkaniu?",
  "filters": {
    "project_ids": ["proj-123"],
    "tags": ["sprint-review"],
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "stream": true  // Streaming odpowiedzi
}
```

### 7.7 Streaming (SSE)

Dla `stream: true`, odpowiedź jest strumieniowana jako Server-Sent Events:

```
data: {"type": "conversation_id", "id": "conv-123"}
data: {"type": "sources", "sources": [...]}
data: {"type": "content", "content": "Na ostatnim"}
data: {"type": "content", "content": " spotkaniu"}
data: {"type": "content", "content": " podjęto..."}
data: {"type": "done"}
```

### 7.8 Filtry Wyszukiwania

| Filtr | Opis |
|-------|------|
| `project_ids` | Lista ID projektów |
| `tags` | Lista tagów |
| `start_date` | Data od |
| `end_date` | Data do |

### 7.9 Funkcje UI

#### Suggested Prompts
Kontekstowe sugestie pytań w zależności od stanu:
- Pusta konwersacja: ogólne pytania
- Po odpowiedzi: follow-up questions

#### Export Konwersacji
Formaty eksportu:
- **Markdown** (`.md`)
- **JSON** (`.json`)
- **Plain Text** (`.txt`)

#### Skróty Klawiaturowe
| Skrót | Akcja |
|-------|-------|
| `Cmd/Ctrl + K` | Focus na input |
| `Cmd/Ctrl + N` | Nowa konwersacja |
| `Cmd/Ctrl + E` | Export jako Markdown |
| `Esc` | Wyczyść input |

### 7.10 Administracja Indeksu

| Endpoint | Opis |
|----------|------|
| `POST /api/v1/knowledge-base/admin/reindex/{meeting_id}` | Reindeksuj pojedyncze spotkanie |
| `POST /api/v1/knowledge-base/admin/reindex-all` | Bulk reindex wszystkich spotkań |
| `GET /api/v1/knowledge-base/admin/stats` | Statystyki indeksu |

---

## 8. System Komentarzy

### 8.1 Model Komentarza

```typescript
interface Comment {
  id: string;
  meeting_id: string;
  author_id: string;
  author_username: string;
  content: string;
  created_at: datetime;
  updated_at: datetime;
}
```

### 8.2 Operacje

| Operacja | Endpoint | Opis |
|----------|----------|------|
| Dodaj | `POST /comments/{meeting_id}` | Nowy komentarz |
| Lista | `GET /comments/{meeting_id}` | Lista komentarzy (paginacja) |
| Edytuj | `PUT /comments/{comment_id}` | Tylko własne |
| Usuń | `DELETE /comments/{comment_id}` | Tylko własne |

### 8.3 Paginacja

- `skip` - liczba komentarzy do pominięcia
- `limit` - maksymalna liczba (domyślnie 50)

---

## 9. Panel Administracyjny

### 9.1 Dashboard

**Endpoint:** `GET /admin/dashboard/stats`

**Statystyki:**
- Łączna liczba użytkowników
- Łączna liczba projektów
- Łączna liczba spotkań

### 9.2 Wykresy Czasowe

#### Rejestracje Użytkowników
```
GET /admin/dashboard/registrations-chart?period_days=30
```

#### Utworzone Spotkania
```
GET /admin/dashboard/meetings-chart?period_days=30
```

**Format odpowiedzi:**
```json
{
  "data": [
    {"date": "2024-01-01", "count": 5},
    {"date": "2024-01-02", "count": 3}
  ]
}
```

### 9.3 Ostatnie Aktywności

```
GET /admin/dashboard/recent-activities?limit=10
```

### 9.4 Strony Administracyjne (Frontend)

| Strona | Ścieżka | Funkcja |
|--------|---------|---------|
| Dashboard | `/admin` | Przegląd statystyk |
| Użytkownicy | `/admin/users` | Zarządzanie użytkownikami |
| Projekty | `/admin/projects` | Zarządzanie projektami |
| Spotkania | `/admin/meetings` | Przegląd wszystkich spotkań |

---

## 10. Powiadomienia Real-time

### 10.1 Architektura

```
Celery Worker                    Notification Service         Frontend
     │                                    │                       │
     │ task completed                     │                       │
     ├─────────────────────────────────▶ │                       │
     │      Redis PubSub                  │                       │
     │      (meeting_processed)           │                       │
     │                                    │ ◀────WebSocket────── │
     │                                    │   connection          │
     │                                    ├─────────────────────▶ │
     │                                    │   push notification   │
     │                                    │                       │
```

### 10.2 Notification Service

**Port:** 8001 (WebSocket)

**Endpoint:** `ws://localhost:8001/ws/{user_id}`

### 10.3 Typy Zdarzeń

```typescript
interface MeetingProcessedEvent {
  event_type: "meeting_processed";
  meeting_id: string;
  project_id: string;
  uploader_id: string;
  status: "completed" | "failed";
  title: string;
}
```

### 10.4 Frontend Handling

```typescript
// Kontekst WebSocket automatycznie:
// 1. Łączy się po zalogowaniu
// 2. Nasłuchuje zdarzenia "meeting.processed"
// 3. Wyświetla toast notification
// 4. Dispatch custom event dla komponentów

window.addEventListener("meeting-processed", (event) => {
  const { meetingId, status } = event.detail;
  // Odśwież dane...
});
```

---

## 11. API Reference

### 11.1 Struktura Odpowiedzi

**Sukces:**
```json
{
  "id": "...",
  "field": "value",
  ...
}
```

**Błąd:**
```json
{
  "detail": "Error message"
}
```

### 11.2 Kody HTTP

| Kod | Opis |
|-----|------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

### 11.3 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /auth/register` | 3/minutę |
| `POST /auth/login` | 5/minutę |
| Pozostałe | 100/minutę (globalne) |

### 11.4 Autoryzacja

Header: `Authorization: Bearer <access_token>`

### 11.5 Pełna Lista Endpointów

#### Auth
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/auth/register` | Rejestracja |
| POST | `/auth/login` | Logowanie |
| POST | `/auth/refresh-token` | Odświeżenie tokenu |

#### Users
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/users/me` | Aktualny użytkownik |
| GET | `/users/` | Lista użytkowników |
| GET | `/users/managers` | Lista managerów |
| GET | `/users/by-manager/{id}` | Użytkownicy managera |
| PUT | `/users/{id}` | Aktualizacja |
| DELETE | `/users/{id}` | Usunięcie |
| PATCH | `/users/{id}/approve` | Zatwierdzenie |
| PATCH | `/users/{id}/revoke` | Cofnięcie dostępu |
| PATCH | `/users/{id}/toggle-edit` | Toggle edycji |

#### Projects
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/project/` | Tworzenie |
| GET | `/project/` | Lista |
| GET | `/project/populated` | Lista z danymi użytkowników |
| GET | `/project/{id}` | Szczegóły |
| GET | `/project/owner/{id}` | Projekty właściciela |
| GET | `/project/member/{id}` | Projekty członka |
| PUT | `/project/{id}` | Aktualizacja |
| DELETE | `/project/{id}` | Usunięcie |

#### Meetings
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/meetings/` | Tworzenie |
| POST | `/meetings/upload` | Upload z plikiem |
| GET | `/meetings/` | Lista (z filtrami) |
| GET | `/meetings/populated` | Lista populated (admin) |
| GET | `/meetings/{id}` | Szczegóły |
| GET | `/meetings/project/{id}` | Spotkania projektu |
| GET | `/meetings/{id}/download` | Pobierz audio |
| PUT | `/meetings/{id}` | Aktualizacja |
| PATCH | `/meetings/{id}` | Częściowa aktualizacja |
| DELETE | `/meetings/{id}` | Usunięcie |

#### Meeting History
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/meeting_history/{id}` | Historia zmian |

#### Comments
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/comments/{meeting_id}` | Dodaj komentarz |
| GET | `/comments/{meeting_id}` | Lista komentarzy |
| PUT | `/comments/{comment_id}` | Edytuj |
| DELETE | `/comments/{comment_id}` | Usuń |

#### Knowledge Base
| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/v1/knowledge-base/conversations` | Nowa konwersacja |
| GET | `/api/v1/knowledge-base/conversations` | Lista konwersacji |
| GET | `/api/v1/knowledge-base/conversations/{id}/messages` | Wiadomości |
| DELETE | `/api/v1/knowledge-base/conversations/{id}` | Usuń konwersację |
| POST | `/api/v1/knowledge-base/chat` | Chat (RAG) |
| POST | `/api/v1/knowledge-base/admin/reindex/{id}` | Reindeksuj spotkanie |
| POST | `/api/v1/knowledge-base/admin/reindex-all` | Bulk reindex |
| GET | `/api/v1/knowledge-base/admin/stats` | Statystyki indeksu |

#### Admin Dashboard
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/admin/dashboard/stats` | Statystyki |
| GET | `/admin/dashboard/registrations-chart` | Wykres rejestracji |
| GET | `/admin/dashboard/meetings-chart` | Wykres spotkań |
| GET | `/admin/dashboard/recent-activities` | Ostatnie aktywności |

#### Health
| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/health` | Status API |

---

## Załączniki

### A. Struktura Katalogów

```
meeting-synthesis/
├── backend/
│   ├── app/
│   │   ├── apis/v1/          # Endpointy API
│   │   ├── core/             # Konfiguracja, logging
│   │   ├── crud/             # Operacje bazodanowe
│   │   ├── db/               # Połączenie MongoDB
│   │   ├── models/           # Modele Pydantic
│   │   ├── schemas/          # Schematy request/response
│   │   ├── services/         # Logika biznesowa
│   │   └── worker/           # Celery tasks
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/       # Komponenty React
│       ├── contexts/         # Auth, WebSocket
│       ├── hooks/            # Custom hooks
│       ├── lib/              # API client, utils
│       ├── pages/            # Strony aplikacji
│       ├── services/         # Service layer
│       └── types/            # TypeScript types
├── notification_service/     # WebSocket service
├── mongo-init/               # Seed data
├── docs/                     # Dokumentacja
└── docker-compose.yml
```

### B. Zmienne Środowiskowe

```bash
# Ogólne
PYTHON_ENV=development

# MongoDB
MONGO_DETAILS=mongodb://localhost:27017/meeting_synthesis_db

# Redis/Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gemma2:2b

# Frontend
VITE_BACKEND_API_BASE_URL=http://localhost:8000
VITE_WEBSOCKET_URL=ws://localhost:8001

# Opcjonalne
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
RAG_MAX_RESULTS=5
RAG_MAX_CONTEXT_LENGTH=4000
```

---

*Dokumentacja wygenerowana: Grudzień 2024*
*Wersja projektu: 0.1.0*
