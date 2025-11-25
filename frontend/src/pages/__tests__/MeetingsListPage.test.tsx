import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MeetingsListPage from "@/pages/MeetingsListPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockDeveloper } from "@/test/mocks/fixtures";
import type { Meeting } from "@/types/meeting";
import type { Project } from "@/types/project";

// Start MSW server for this test file
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const API_BASE = "http://localhost:8000";

const mockProjects: Project[] = [
  {
    _id: "project-001",
    name: "Alpha Project",
    description: "First project",
    owner_id: "user-001",
    members_ids: ["user-001", mockDeveloper._id],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    _id: "project-002",
    name: "Beta Project",
    description: "Second project",
    owner_id: "user-002",
    members_ids: ["user-002", mockDeveloper._id],
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
  },
];

const mockMeetings: Meeting[] = [
  {
    _id: "meeting-001",
    title: "Team Standup",
    project_id: "project-001",
    uploader_id: mockDeveloper._id,
    meeting_datetime: "2025-11-20T10:00:00Z",
    tags: ["standup", "team"],
    duration_seconds: 1800,
    processing_status: {
      current_stage: "completed",
      completed_at: "2025-11-20T10:35:00Z",
    },
    created_at: "2025-11-20T09:00:00Z",
    updated_at: "2025-11-20T10:35:00Z",
  },
  {
    _id: "meeting-002",
    title: "Sprint Planning",
    project_id: "project-002",
    uploader_id: mockDeveloper._id,
    meeting_datetime: "2025-11-21T14:00:00Z",
    tags: ["planning", "sprint"],
    duration_seconds: 3600,
    processing_status: {
      current_stage: "analyzing",
      progress: 60,
    },
    created_at: "2025-11-21T13:00:00Z",
    updated_at: "2025-11-21T14:00:00Z",
  },
  {
    _id: "meeting-003",
    title: "Retrospective",
    project_id: "project-001",
    uploader_id: mockDeveloper._id,
    meeting_datetime: "2025-11-22T16:00:00Z",
    tags: ["retrospective", "team"],
    duration_seconds: 2400,
    processing_status: {
      current_stage: "completed",
      completed_at: "2025-11-22T16:45:00Z",
    },
    created_at: "2025-11-22T15:00:00Z",
    updated_at: "2025-11-22T16:45:00Z",
  },
];

const renderMeetingsListPage = () => {
  // Set up auth state with refresh_token to trigger auth flow
  localStorage.setItem("refresh_token", "test-refresh-token");

  return render(
    <MemoryRouter>
      <AuthProvider>
        <MeetingsListPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe("MeetingsListPage", () => {
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
      http.get(`${API_BASE}/project/member/:userId`, () => {
        return HttpResponse.json(mockProjects);
      }),
      http.get(`${API_BASE}/meetings`, () => {
        return HttpResponse.json(mockMeetings);
      })
    );
  });

  describe("Rendering", () => {
    it("renders page title", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /meetings/i })).toBeInTheDocument();
      });
    });

    it("renders Add Meeting button", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add meeting/i })).toBeInTheDocument();
      });
    });
  });

  describe("Data Loading", () => {
    it("displays meetings after loading", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
      expect(screen.getByText("Retrospective")).toBeInTheDocument();
    });

    it("displays meeting count", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText(/3 of 3 meetings shown/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("shows error state on fetch failure", async () => {
      server.use(
        http.get(`${API_BASE}/project/member/:userId`, () => {
          return HttpResponse.json({ error: "Failed" }, { status: 500 });
        })
      );

      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch member projects/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("shows empty state when no meetings exist", async () => {
      server.use(
        http.get(`${API_BASE}/meetings`, () => {
          return HttpResponse.json([]);
        })
      );

      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText(/no meetings found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("Search and Filtering", () => {
    it("filters meetings by search term", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText(/search meetings/i);
      fireEvent.change(searchInput, { target: { value: "standup" } });

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
        expect(screen.queryByText("Sprint Planning")).not.toBeInTheDocument();
        expect(screen.queryByText("Retrospective")).not.toBeInTheDocument();
      });

      // Check updated count
      expect(screen.getByText(/1 of 3 meetings shown/i)).toBeInTheDocument();
    });

    it("shows empty state when search has no results", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByPlaceholderText(/search meetings/i);
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText(/no meetings found/i)).toBeInTheDocument();
      });
    });
  });

  describe("Add Meeting Dialog", () => {
    it("opens Add Meeting dialog when button is clicked", async () => {
      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add meeting/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.click(screen.getByRole("button", { name: /add meeting/i }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /add a new meeting/i })).toBeInTheDocument();
      });
    });
  });

  describe("WebSocket Events", () => {
    it("refreshes data when meeting-processed event is received", async () => {
      let fetchCount = 0;
      server.use(
        http.get(`${API_BASE}/meetings`, () => {
          fetchCount++;
          return HttpResponse.json(mockMeetings);
        })
      );

      renderMeetingsListPage();

      await waitFor(() => {
        expect(screen.getByText("Team Standup")).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initial fetch should have happened
      expect(fetchCount).toBe(1);

      // Dispatch meeting-processed event
      const event = new CustomEvent("meeting-processed", {
        detail: { meetingId: "meeting-001", status: "completed" },
      });
      window.dispatchEvent(event);

      // Wait for refetch
      await waitFor(() => {
        expect(fetchCount).toBe(2);
      }, { timeout: 1000 });
    });
  });
});
