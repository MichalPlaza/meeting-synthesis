import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MeetingCommentsSection } from "@/components/MeetingCommentsSection";
import { AuthProvider } from "@/AuthContext";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockDeveloper, mockComments } from "@/test/mocks/fixtures";

// Start MSW server for this test file
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const API_BASE = "http://localhost:8000";
const TEST_MEETING_ID = "meeting-001";

const renderCommentsSection = (meetingId: string = TEST_MEETING_ID) => {
  // Set up auth state with refresh_token to trigger auth flow
  localStorage.setItem("refresh_token", "test-refresh-token");

  return render(
    <MemoryRouter>
      <AuthProvider>
        <MeetingCommentsSection meetingId={meetingId} />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe("MeetingCommentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    // Set up default handlers
    server.use(
      http.post(`${API_BASE}/auth/refresh-token`, () => {
        return HttpResponse.json({
          access_token: "test-token",
          token_type: "bearer",
        });
      }),
      http.get(`${API_BASE}/users/me`, () => {
        return HttpResponse.json(mockDeveloper);
      }),
      http.get(`${API_BASE}/comments/:meetingId`, () => {
        return HttpResponse.json(mockComments);
      })
    );
  });

  describe("Rendering", () => {
    it("renders comments section with header", async () => {
      renderCommentsSection();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /comments/i })).toBeInTheDocument();
      });
    });

    it("displays comments after loading", async () => {
      renderCommentsSection();

      // Wait for comments to load and display
      await waitFor(() => {
        expect(screen.getByText(mockComments[0].content)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Check for all comment content
      mockComments.forEach((comment) => {
        expect(screen.getByText(comment.content)).toBeInTheDocument();
      });
    });

    it("shows empty state when no comments exist", async () => {
      server.use(
        http.get(`${API_BASE}/comments/:meetingId`, () => {
          return HttpResponse.json([]);
        })
      );

      renderCommentsSection();

      await waitFor(() => {
        expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it("renders comment input textarea", async () => {
      renderCommentsSection();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/write a comment/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it("renders post comment button", async () => {
      renderCommentsSection();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /post comment/i })).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe("Adding Comments", () => {
    it("disables post button when textarea is empty", async () => {
      renderCommentsSection();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/write a comment/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const postButton = screen.getByRole("button", { name: /post comment/i });
      expect(postButton).toBeDisabled();
    });

    it("enables post button when textarea has content", async () => {
      const user = userEvent.setup();
      renderCommentsSection();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/write a comment/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const textarea = screen.getByPlaceholderText(/write a comment/i);
      await user.type(textarea, "New comment");

      const postButton = screen.getByRole("button", { name: /post comment/i });
      expect(postButton).not.toBeDisabled();
    });
  });
});
