import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "@/pages/RegisterPage";
import { AuthProvider } from "@/AuthContext";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockManagers } from "@/test/mocks/fixtures";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

// Start MSW server for this test file
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const API_BASE = "http://localhost:8000";

const renderRegisterPage = () => {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    // Default handlers
    server.use(
      http.post(`${API_BASE}/auth/refresh-token`, () => {
        return HttpResponse.json({ detail: "No token" }, { status: 401 });
      }),
      http.get(`${API_BASE}/users/managers`, () => {
        return HttpResponse.json(mockManagers);
      })
    );
  });

  describe("Rendering", () => {
    it("renders registration form with all text input fields", async () => {
      renderRegisterPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /create an account/i })).toBeInTheDocument();
      });

      // Check text input fields exist
      expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("has link to login page", async () => {
      renderRegisterPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /create an account/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
    });
  });

  describe("Manager Loading", () => {
    it("shows error when managers fail to load", async () => {
      server.use(
        http.get(`${API_BASE}/users/managers`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        })
      );

      renderRegisterPage();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to load managers. Try refreshing the page."
        );
      });
    });
  });
});
