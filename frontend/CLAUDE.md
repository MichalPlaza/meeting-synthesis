# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript frontend for a meeting synthesis application. It provides UI for managing meetings, projects, and an AI-powered knowledge base for querying meeting content. The app uses real-time WebSocket notifications and integrates with a Python FastAPI backend.

## Development Commands

### Package Management
Uses **pnpm** (v10.11.1+) - NOT npm or yarn:
```bash
pnpm install          # Install dependencies
pnpm add <package>    # Add new package
```

### Development
```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # TypeScript check + production build
pnpm preview          # Preview production build
```

### Testing
```bash
pnpm test             # Run tests in watch mode
pnpm test:ui          # Open Vitest UI (http://localhost:51204)
pnpm test:coverage    # Run tests with coverage report
vitest run <file>     # Run specific test file
```

### Code Quality
```bash
pnpm lint             # ESLint check
pnpm format           # Format with Prettier
```

## Architecture & Core Patterns

### API Communication Layer

**Centralized API Client** (`src/lib/api/client.ts`):
- ALL backend HTTP requests MUST use the centralized API client
- Never use raw `fetch()` for backend API calls (except SSE streaming)
- Client automatically handles authentication tokens and errors

```typescript
import { api } from "@/lib/api/client";

// Standard requests
const data = await api.get<Meeting[]>("/meetings", token);
await api.post("/meetings", { title: "New Meeting" }, token);
await api.patch<Meeting>(`/meetings/${id}`, updates, token);
await api.delete(`/meetings/${id}`, token);

// For file downloads or special URLs
import { getApiBaseUrl } from "@/lib/api/client";
const audioUrl = `${getApiBaseUrl()}/meetings/${id}/audio`;
```

**Exception**: Server-Sent Events (SSE) streaming in `src/services/knowledge-base.ts` requires native fetch for ReadableStream support.

### Authentication & Authorization

**AuthContext** (`src/contexts/AuthContext.tsx`):
- Manages authentication state, tokens (access + refresh), and user data
- Automatically attempts session refresh on app startup using refresh token
- Stores tokens in localStorage
- Provides `useAuth()` hook for components

**Route Protection**:
- `<ProtectedRoute>`: Requires authentication
- `<AdminProtectedRoute>`: Requires admin role (user.role === "admin")

### Real-time Notifications

**WebSocketContext** (`src/contexts/WebSocketContext.tsx`):
- Automatically connects when user authenticates
- Listens for `meeting.processed` events from notification service
- Displays toast notifications + dispatches custom window events
- Other components listen via `window.addEventListener("meeting-processed", handler)`

Example usage in components:
```typescript
useEffect(() => {
  const handleMeetingProcessed = (event: Event) => {
    const customEvent = event as CustomEvent<{ meetingId: string; status: string }>;
    fetchData(); // Refresh data
  };
  window.addEventListener("meeting-processed", handleMeetingProcessed);
  return () => window.removeEventListener("meeting-processed", handleMeetingProcessed);
}, [fetchData]);
```

### Testing Infrastructure

**MSW (Mock Service Worker)** for API mocking:
- Handlers defined in `src/test/mocks/handlers.ts`
- Server setup in `src/test/mocks/server.ts`
- Tests must explicitly start MSW server:

```typescript
import { server } from "@/test/mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Test Setup** (`src/test/setup.ts` + `src/test/preload.ts`):
- preload.ts: Sets up global mocks (localStorage) before MSW loads
- setup.ts: Configures @testing-library/jest-dom and cleanup

**Coverage Thresholds**: 70% for statements/branches/functions/lines

### Component Architecture

**Feature-based Organization**:
```
src/components/
  ├── common/         # Reusable components (ErrorState, EmptyState, etc.)
  ├── ui/             # shadcn/ui design system components
  ├── features/       # Feature-specific components
  │   ├── auth/       # Login, Register, ProtectedRoute
  │   ├── meetings/   # Meeting list, details, comments
  │   ├── projects/   # Project management
  │   └── knowledge-base/  # AI chat interface
  ├── layout/         # Header, Sidebar, etc.
  └── admin/          # Admin-only components (user/project tables)
```

**Pages** (`src/pages/`):
- Each page is a top-level route component
- Pages compose feature components and manage data fetching
- Admin pages in `src/pages/admin/`

### State Management

**No global state library** - using React built-ins:
- Context API for cross-cutting concerns (Auth, WebSocket)
- useState/useReducer for local state
- Custom hooks in `src/hooks/` for reusable logic

### Error Handling

**ApiError Class**:
```typescript
try {
  await api.get("/meetings", token);
} catch (err) {
  if (err instanceof ApiError) {
    console.error(`API Error ${err.status}: ${err.message}`);
  }
}
```

**Error Boundaries**: Wrap pages/sections to catch React rendering errors

### Logging

**Structured logging** (`src/services/logging.ts`):
```typescript
import log from "@/services/logging";

log.debug("Detailed debug info");
log.info("General information");
log.warn("Warning message");
log.error("Error occurred", error);
```

## Environment Configuration

Required environment variables in `.env`:
```bash
VITE_BACKEND_API_BASE_URL=http://localhost:8000    # Backend API URL
VITE_WEBSOCKET_URL=ws://localhost:8001             # WebSocket notifications
```

## Common Patterns & Conventions

### Import Aliases
- Use `@/` for src imports: `import { api } from "@/lib/api/client"`

### TypeScript Types
- API response types in `src/types/` (meeting.ts, project.ts, user.ts, etc.)
- Always type API responses: `api.get<Meeting[]>(...)`

### Toast Notifications
Use sonner for user feedback:
```typescript
import { toast } from "sonner";
toast.success("Operation successful");
toast.error("Operation failed");
```

### Data Fetching Pattern
```typescript
const [data, setData] = useState<Meeting[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await api.get<Meeting[]>("/meetings", token);
    setData(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    setLoading(false);
  }
};
```

### AbortController for Cleanup
Use when fetching in useEffect to prevent state updates after unmount:
```typescript
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    const data = await api.get("/endpoint", token);
    if (!controller.signal.aborted) {
      setState(data);
    }
  };

  fetchData();
  return () => controller.abort();
}, []);
```

## UI/UX Guidelines

### Design System
- Uses **shadcn/ui** components (Radix UI + Tailwind CSS)
- Components in `src/components/ui/`
- Tailwind CSS v4 with custom design tokens

### Loading States
- Use skeleton loaders for content (e.g., `MeetingListItemSkeleton`)
- Show spinners for actions (submit buttons)

### Empty & Error States
- Use `<EmptyState>` for no data scenarios
- Use `<ErrorState>` with retry callback for errors

### Accessibility
- Use semantic HTML
- Include ARIA labels for icon buttons
- LiveRegion for screen reader announcements (WebSocket notifications)

## Key Technical Decisions

1. **No BACKEND_API_BASE_URL in Components**: Only in `src/vite-env.d.ts` (type def) and `src/lib/api/client.ts` (source). All components use the API client.

2. **Test Isolation**: MSW not auto-started to avoid module loading issues. Tests opt-in to API mocking.

3. **Dependent Fetching**: Some pages (MeetingsListPage) fetch projects first, then use IDs to fetch related meetings. Handle errors at each step.

4. **404 Handling**: Some endpoints (e.g., meeting history) return 404 when no data exists - this is expected, not an error.

5. **Streaming Responses**: Knowledge base chat uses SSE streaming with native fetch, not the API client.

## Common Pitfalls

- ❌ Using `fetch()` directly instead of API client
- ❌ Not starting MSW server in tests that need API mocking
- ❌ Forgetting to cleanup event listeners in useEffect
- ❌ Not checking abort signal before setting state
- ❌ Using npm/yarn instead of pnpm
