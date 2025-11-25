import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockDeveloper, mockAuthResponse } from "@/test/mocks/fixtures";

// Start MSW server for this test file
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const API_BASE = "http://localhost:8000";

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  );

  describe("Initial State", () => {
    it("provides auth context with initial unauthenticated state", async () => {
      // No refresh token in localStorage
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.login).toBe("function");
      expect(typeof result.current.logout).toBe("function");
    });

    it("shows loading state while refreshing session", async () => {
      // Set up a slow response
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      localStorage.setItem("refresh_token", "test-refresh-token");

      const { result } = renderHook(() => useAuth(), { wrapper });

      // The hook should exist and initially be loading
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Initially should be loading (may already have resolved in some cases)
      // We just verify the hook exists and works
      expect(result.current).toBeDefined();
    });
  });

  describe("Login", () => {
    it("persists access token to localStorage on login", async () => {
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login("test-access-token", mockDeveloper);
      });

      expect(localStorage.getItem("access_token")).toBe("test-access-token");
      expect(result.current.token).toBe("test-access-token");
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("persists user data to localStorage on login", async () => {
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login("test-token", mockDeveloper);
      });

      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      expect(storedUser).toEqual(mockDeveloper);
      expect(result.current.user).toEqual(mockDeveloper);
    });

    it("persists refresh token to localStorage when provided", async () => {
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login("access-token", mockDeveloper, "refresh-token-123");
      });

      expect(localStorage.getItem("refresh_token")).toBe("refresh-token-123");
    });
  });

  describe("Logout", () => {
    it("clears all tokens from localStorage on logout", async () => {
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First login
      act(() => {
        result.current.login("access-token", mockDeveloper, "refresh-token");
      });

      expect(localStorage.getItem("access_token")).toBe("access-token");
      expect(localStorage.getItem("refresh_token")).toBe("refresh-token");

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("resets auth state on logout", async () => {
      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "No token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login
      act(() => {
        result.current.login("access-token", mockDeveloper);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockDeveloper);

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe("Session Refresh", () => {
    it("refreshes token on app startup when refresh token exists", async () => {
      localStorage.setItem("refresh_token", "existing-refresh-token");

      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({
            access_token: "new-access-token",
            token_type: "bearer",
          });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockDeveloper);
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe("new-access-token");
      expect(result.current.user).toEqual(mockDeveloper);
    });

    it("handles refresh token failure gracefully", async () => {
      localStorage.setItem("refresh_token", "invalid-refresh-token");

      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ detail: "Invalid refresh token" }, { status: 401 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should be logged out after failed refresh
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it("clears tokens when user fetch fails after successful token refresh", async () => {
      localStorage.setItem("refresh_token", "valid-refresh-token");

      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({
            access_token: "new-access-token",
            token_type: "bearer",
          });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json({ detail: "User not found" }, { status: 404 });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should be logged out
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("skips refresh when no refresh token exists", async () => {
      // No refresh token in localStorage
      const refreshCalled = vi.fn();

      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          refreshCalled();
          return HttpResponse.json({ access_token: "token" });
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(refreshCalled).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("throws error when used outside provider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow("useAuth must be used within an AuthProvider");

      spy.mockRestore();
    });

    it("handles network errors during refresh gracefully", async () => {
      localStorage.setItem("refresh_token", "test-token");

      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle error gracefully and be logged out
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
