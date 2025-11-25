import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WebSocketProvider, useWebSocket } from "@/WebSocketContext";
import { AuthProvider } from "@/AuthContext";
import type { ReactNode } from "react";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:8000";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

// Mock the logging service
vi.mock("@/services/logging", () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
  }

  // Helper to simulate raw message (for testing parse errors)
  simulateRawMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  static clearInstances() {
    MockWebSocket.instances = [];
  }

  static getLastInstance() {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

// Replace global WebSocket using vitest's stubGlobal
beforeEach(() => {
  MockWebSocket.clearInstances();
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockUser = {
  _id: "user-ws-test",
  username: "testuser",
  email: "test@example.com",
  name: "Test User",
  role: "developer" as const,
};

describe("WebSocketContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    // Default: no authentication
    server.use(
      http.post(`${API_BASE}/auth/refresh-token`, () => {
        return HttpResponse.json({ detail: "No token" }, { status: 401 });
      })
    );
  });

  describe("useWebSocket Hook", () => {
    it("throws error when used outside WebSocketProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWebSocket());
      }).toThrow("useWebSocket must be used within a WebSocketProvider");

      spy.mockRestore();
    });

    it("returns context when used within WebSocketProvider", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      expect(result.current).toBeDefined();
    });
  });

  describe("WebSocket Connection", () => {
    it("does not connect when user is not authenticated", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      // Wait a bit to ensure no connection attempt
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(MockWebSocket.instances.length).toBe(0);
    });

    it("connects when user is authenticated", async () => {
      // Set up authenticated state
      const mockUser = {
        _id: "user-123",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();
      expect(ws.url).toContain("/ws/user-123");
    });

    it("closes connection when component unmounts", async () => {
      const mockUser = {
        _id: "user-456",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const { unmount } = renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();

      // Wait for connection to open
      await waitFor(() => {
        expect(ws.readyState).toBe(1);
      });

      unmount();

      expect(ws.readyState).toBe(3); // CLOSED
    });
  });

  describe("Message Handling", () => {
    it("shows success toast for completed meeting.processed event", async () => {
      const mockUser = {
        _id: "user-789",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();

      // Wait for connection to open
      await waitFor(() => {
        expect(ws.readyState).toBe(1);
      });

      // Simulate receiving a meeting.processed message
      act(() => {
        ws.simulateMessage({
          event_type: "meeting.processed",
          status: "completed",
          title: "Test Meeting",
          meeting_id: "meeting-123",
        });
      });

      expect(toast.success).toHaveBeenCalledWith(
        'Meeting "Test Meeting" has finished processing!',
        expect.objectContaining({
          description: "Click to view the details.",
          duration: 10000,
        })
      );
    });

    it("shows error toast for failed meeting.processed event", async () => {
      const mockUser = {
        _id: "user-abc",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();

      await waitFor(() => {
        expect(ws.readyState).toBe(1);
      });

      act(() => {
        ws.simulateMessage({
          event_type: "meeting.processed",
          status: "failed",
          title: "Failed Meeting",
          meeting_id: "meeting-456",
        });
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Meeting "Failed Meeting" has failed!',
        expect.objectContaining({
          description: "Click to view the details.",
          duration: 10000,
        })
      );
    });

    it("dispatches custom event for meeting.processed", async () => {
      const mockUser = {
        _id: "user-def",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const eventHandler = vi.fn();
      window.addEventListener("meeting-processed", eventHandler);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();

      await waitFor(() => {
        expect(ws.readyState).toBe(1);
      });

      act(() => {
        ws.simulateMessage({
          event_type: "meeting.processed",
          status: "completed",
          title: "Event Test Meeting",
          meeting_id: "meeting-event-123",
        });
      });

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({
        meetingId: "meeting-event-123",
        status: "completed",
      });

      window.removeEventListener("meeting-processed", eventHandler);
    });

    it("handles malformed JSON messages gracefully", async () => {
      const mockUser = {
        _id: "user-ghi",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();

      await waitFor(() => {
        expect(ws.readyState).toBe(1);
      });

      // Should not throw, just log error
      expect(() => {
        act(() => {
          ws.simulateRawMessage("not valid json");
        });
      }).not.toThrow();

      // Toast should not be called for malformed messages
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("ignores non-meeting.processed events", async () => {
      const mockUser = {
        _id: "user-jkl",
        username: "testuser",
        email: "test@example.com",
        name: "Test User",
        role: "developer" as const,
      };

      // Mock successful refresh to authenticate user
      localStorage.setItem("refresh_token", "test-refresh-token");
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ access_token: "test-token" });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      renderHook(() => useWebSocket(), { wrapper });

      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const ws = MockWebSocket.getLastInstance();

      await waitFor(() => {
        expect(ws.readyState).toBe(1);
      });

      act(() => {
        ws.simulateMessage({
          event_type: "some.other.event",
          data: "test",
        });
      });

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
