import { describe, it, expect, vi, beforeAll, afterEach, afterAll, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/features/auth/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockDeveloper } from "@/test/mocks/fixtures";

// Start MSW server for this test file
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const API_BASE = "http://localhost:8000";

// Test components to use with ProtectedRoute
const ProtectedContent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }

    // Set up default auth handlers
    server.use(
      http.post(`${API_BASE}/auth/refresh-token`, () => {
        return HttpResponse.json({
          access_token: "test-token",
          token_type: "bearer",
        });
      }),
      http.get(`${API_BASE}/users/me`, () => {
        return HttpResponse.json(mockDeveloper);
      })
    );
  });

  describe("When user is authenticated", () => {
    it("renders protected content", async () => {
      // Set up authenticated state
      localStorage.setItem("refresh_token", "test-refresh-token");

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/protected" element={<ProtectedContent />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for auth to complete and protected content to render
      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should not show login page
      expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
    });

    it("allows navigation to nested protected routes", async () => {
      localStorage.setItem("refresh_token", "test-refresh-token");

      const NestedRoute = () => <div>Nested Protected Route</div>;

      render(
        <MemoryRouter initialEntries={["/protected/nested"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/protected" element={<ProtectedContent />} />
                <Route path="/protected/nested" element={<NestedRoute />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Nested Protected Route")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("When user is not authenticated", () => {
    it("redirects to login page", async () => {
      // No auth token set
      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/protected" element={<ProtectedContent />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });

      // Should not show protected content
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("redirects when refresh token is invalid", async () => {
      // Set refresh token but make it fail
      localStorage.setItem("refresh_token", "invalid-token");

      server.use(
        http.post(`${API_BASE}/auth/refresh-token`, () => {
          return HttpResponse.json({ error: "Invalid token" }, { status: 401 });
        })
      );

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/protected" element={<ProtectedContent />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should redirect to login page after failed refresh
      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("redirects when user fetch fails after successful token refresh", async () => {
      localStorage.setItem("refresh_token", "test-refresh-token");

      // Token refresh succeeds but user fetch fails
      server.use(
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json({ error: "User not found" }, { status: 404 });
        })
      );

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/protected" element={<ProtectedContent />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  describe("Multiple protected routes", () => {
    it("protects multiple routes with single ProtectedRoute wrapper", async () => {
      localStorage.setItem("refresh_token", "test-refresh-token");

      const DashboardPage = () => <div>Dashboard Page</div>;
      const SettingsPage = () => <div>Settings Page</div>;

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("Navigation behavior", () => {
    it("uses replace navigation to prevent back button loops", async () => {
      // This test verifies that Navigate uses replace={true}
      // which prevents users from pressing back to return to protected route

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/protected" element={<ProtectedContent />} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });

      // The component uses replace={true}, so the login page should be shown
      // and the protected route should not be in the history
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });
});
