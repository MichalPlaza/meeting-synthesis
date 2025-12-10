import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockDeveloper } from "@/test/mocks/fixtures";

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

const renderLoginPage = () => {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    // Default handler for refresh token (no existing session)
    server.use(
      http.post(`${API_BASE}/auth/refresh-token`, () => {
        return HttpResponse.json({ detail: "No token" }, { status: 401 });
      })
    );
  });

  describe("Rendering", () => {
    it("renders login form with all fields", async () => {
      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /log in to your account/i })).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /create an account/i })).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("submits form with valid credentials", async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_BASE}/auth/login`, () => {
          return HttpResponse.json({
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
          });
        }),
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json(mockDeveloper);
        })
      );

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /log in to your account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText(/your email/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("shows error on invalid credentials", async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_BASE}/auth/login`, () => {
          return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
        })
      );

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /log in to your account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText(/your email/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
      });
    });

    it("shows error on network failure", async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_BASE}/auth/login`, () => {
          return HttpResponse.error();
        })
      );

      renderLoginPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /log in to your account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText(/your email/i);
      const passwordInput = screen.getByPlaceholderText(/your password/i);

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "An error occurred while connecting to the server."
        );
      });
    });
  });
});
