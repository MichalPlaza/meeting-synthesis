import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AddMeetingDialog } from "@/components/features/meetings/AddMeetingDialog";
import { AuthProvider } from "@/contexts/AuthContext";
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";
import { mockDeveloper } from "@/test/mocks/fixtures";
import type { Project } from "@/types/project";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock axios for file upload
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import { toast } from "sonner";
import axios from "axios";

// Start MSW server for this test file
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const API_BASE = "http://localhost:8000";

const mockProjectsData: Project[] = [
  {
    _id: "project-001",
    name: "Test Project",
    description: "A test project",
    owner_id: "user-pm-001",
    members_ids: ["user-pm-001", "user-dev-001"],
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-01-10T00:00:00Z",
  },
  {
    _id: "project-002",
    name: "Another Project",
    description: "Another test project",
    owner_id: "user-pm-001",
    members_ids: ["user-pm-001"],
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
];

const renderDialog = (props: Partial<React.ComponentProps<typeof AddMeetingDialog>> = {}) => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    projects: mockProjectsData,
    onMeetingAdded: vi.fn(),
  };

  // Set up auth state
  localStorage.setItem("access_token", "test-token");
  localStorage.setItem("user", JSON.stringify(mockDeveloper));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <AddMeetingDialog {...defaultProps} {...props} />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe("AddMeetingDialog", () => {
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
      })
    );
  });

  describe("Rendering", () => {
    it("renders dialog with all form fields when open", async () => {
      renderDialog();

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      expect(screen.getByRole("heading", { name: /add a new meeting/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/meeting title/i)).toBeInTheDocument();
      expect(screen.getByText(/^Project$/i)).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument(); // The select element
      expect(screen.getByText(/^Audio File$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add meeting/i })).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      renderDialog({ isOpen: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("shows error when title is too short", async () => {
      const user = userEvent.setup();
      renderDialog();

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Find title input by its label text
      const titleInput = screen.getByLabelText(/meeting title/i);
      await user.type(titleInput, "ab");
      await user.click(screen.getByRole("button", { name: /add meeting/i }));

      await waitFor(() => {
        expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("calls onOpenChange when cancel is clicked", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderDialog({ onOpenChange });

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // TODO: Update this test to work with Radix Select component
    // Radix Select uses portals which require special testing setup
    // See: https://github.com/radix-ui/primitives/issues/1822
    it.skip("shows error when user is not logged in", async () => {
      // Clear auth state
      localStorage.clear();

      const user = userEvent.setup();
      const mockFile = new File(["audio content"], "test.mp3", { type: "audio/mpeg" });

      renderDialog();

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Fill in the form with valid data
      const titleInput = screen.getByLabelText(/meeting title/i);
      await user.type(titleInput, "Valid Title That Is Long Enough");

      // TODO: Need to properly interact with Radix Select in tests
      // This requires mocking portals or using @testing-library/user-event with proper setup
      const projectSelect = screen.getByRole("combobox");
      expect(projectSelect).toBeInTheDocument();

      // Try to submit the form (it will fail validation due to missing file)
      await user.click(screen.getByRole("button", { name: /add meeting/i }));

      await waitFor(() => {
        // The form should show validation error about missing file
        // Let's verify the dialog is still open (form didn't submit)
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });
});
