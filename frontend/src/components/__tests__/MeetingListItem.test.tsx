import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MeetingListItem from "@/components/MeetingListItem";
import type { Meeting } from "@/types/meeting";
import type { Project } from "@/types/project";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockMeeting: Meeting = {
  _id: "meeting-001",
  title: "Team Standup",
  project_id: "project-001",
  uploader_id: "user-001",
  meeting_datetime: "2025-11-20T10:00:00Z",
  tags: ["standup", "team"],
  duration_seconds: 1800,
  processing_status: {
    current_stage: "completed",
    completed_at: "2025-11-20T10:35:00Z",
  },
  created_at: "2025-11-20T09:00:00Z",
  updated_at: "2025-11-20T10:35:00Z",
};

const mockProject: Project = {
  _id: "project-001",
  name: "Alpha Project",
  description: "First project",
  owner_id: "user-001",
  members_ids: ["user-001"],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("MeetingListItem", () => {
  describe("Rendering", () => {
    it("renders meeting title as a link", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      const titleLink = screen.getByRole("link", { name: "Team Standup" });
      expect(titleLink).toBeInTheDocument();
      expect(titleLink).toHaveAttribute("href", "/meetings/meeting-001");
    });

    it("displays formatted date", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      // Date should be formatted as dd-MM-yyyy
      expect(screen.getByText(/20-11-2025/)).toBeInTheDocument();
    });

    it("displays relative time", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      // Should display "X ago" - exact text depends on current date
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it("renders tags when present", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      expect(screen.getByText("standup")).toBeInTheDocument();
      expect(screen.getByText("team")).toBeInTheDocument();
    });

    it("does not render tags section when no tags", () => {
      const meetingWithoutTags = { ...mockMeeting, tags: [] };

      const { container } = render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithoutTags} project={mockProject} />
        </MemoryRouter>
      );

      // No tags should be rendered
      const tags = container.querySelectorAll('.rounded-\\[var\\(--radius-pill\\)\\]');
      expect(tags.length).toBe(0);
    });

    it("renders project information when provided", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      const projectLink = screen.getByRole("link", { name: "Alpha Project" });
      expect(projectLink).toBeInTheDocument();
      expect(projectLink).toHaveAttribute("href", "/projects/project-001");
    });

    it("does not render project information when not provided", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} />
        </MemoryRouter>
      );

      expect(screen.queryByRole("link", { name: "Alpha Project" })).not.toBeInTheDocument();
    });

    it("renders duration when present", () => {
      render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      // 1800 seconds = 30 minutes
      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("does not render duration when not present", () => {
      const meetingWithoutDuration = { ...mockMeeting, duration_seconds: null };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithoutDuration} project={mockProject} />
        </MemoryRouter>
      );

      // Duration section should not be present
      expect(screen.queryByTitle("Duration")).not.toBeInTheDocument();
    });

    it("renders all icons correctly", () => {
      const { container } = render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      // Check for SVG icons (Folder and Clock from lucide-react)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe("Duration Formatting", () => {
    it("formats seconds correctly (less than 60)", () => {
      const meetingWithSeconds = { ...mockMeeting, duration_seconds: 45 };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithSeconds} project={mockProject} />
        </MemoryRouter>
      );

      expect(screen.getByText("45s")).toBeInTheDocument();
    });

    it("formats minutes correctly", () => {
      const meetingWithMinutes = { ...mockMeeting, duration_seconds: 600 };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithMinutes} project={mockProject} />
        </MemoryRouter>
      );

      expect(screen.getByText("10m")).toBeInTheDocument();
    });

    it("formats hours and minutes correctly", () => {
      const meetingWithHours = { ...mockMeeting, duration_seconds: 7200 };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithHours} project={mockProject} />
        </MemoryRouter>
      );

      expect(screen.getByText("2h 0m")).toBeInTheDocument();
    });

    it("formats hours and minutes with remainder correctly", () => {
      const meetingWithHoursAndMinutes = { ...mockMeeting, duration_seconds: 7380 };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithHoursAndMinutes} project={mockProject} />
        </MemoryRouter>
      );

      // 7380 seconds = 2 hours and 3 minutes
      expect(screen.getByText("2h 3m")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has title attribute on date section", () => {
      const { container } = render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      const dateSection = container.querySelector('[title="Meeting Date"]');
      expect(dateSection).toBeInTheDocument();
    });

    it("has title attribute on project section", () => {
      const { container } = render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      const projectSection = container.querySelector('[title="Project"]');
      expect(projectSection).toBeInTheDocument();
    });

    it("has title attribute on duration section", () => {
      const { container } = render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      const durationSection = container.querySelector('[title="Duration"]');
      expect(durationSection).toBeInTheDocument();
    });
  });

  describe("Multiple Tags", () => {
    it("renders multiple tags correctly", () => {
      const meetingWithManyTags = {
        ...mockMeeting,
        tags: ["standup", "team", "important", "urgent"],
      };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={meetingWithManyTags} project={mockProject} />
        </MemoryRouter>
      );

      expect(screen.getByText("standup")).toBeInTheDocument();
      expect(screen.getByText("team")).toBeInTheDocument();
      expect(screen.getByText("important")).toBeInTheDocument();
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles meeting with all optional fields missing", () => {
      const minimalMeeting: Meeting = {
        _id: "meeting-minimal",
        title: "Minimal Meeting",
        project_id: "project-001",
        uploader_id: "user-001",
        meeting_datetime: "2025-11-20T10:00:00Z",
        tags: [],
        duration_seconds: null,
        processing_status: {
          current_stage: "completed",
        },
        created_at: "2025-11-20T09:00:00Z",
        updated_at: "2025-11-20T10:35:00Z",
      };

      render(
        <MemoryRouter>
          <MeetingListItem meeting={minimalMeeting} />
        </MemoryRouter>
      );

      // Should still render title and date
      expect(screen.getByText("Minimal Meeting")).toBeInTheDocument();
      expect(screen.getByText(/20-11-2025/)).toBeInTheDocument();
    });

    it("renders as list item", () => {
      const { container } = render(
        <MemoryRouter>
          <MeetingListItem meeting={mockMeeting} project={mockProject} />
        </MemoryRouter>
      );

      const listItem = container.querySelector("li");
      expect(listItem).toBeInTheDocument();
      expect(listItem).toHaveClass("list-none");
    });
  });
});
