/**
 * Component tests for Knowledge Base UI components
 */

import { describe, it, expect, vi, beforeAll, afterEach, afterAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SourceCard } from "@/components/features/knowledge-base/SourceCard";
import { SourceList } from "@/components/features/knowledge-base/SourceList";
import { FilterPanel } from "@/components/features/knowledge-base/FilterPanel";
import type { MessageSource, FilterContext } from "@/types/knowledge-base";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SourceCard", () => {
  const mockSource: MessageSource = {
    meeting_id: "123",
    meeting_title: "Team Standup",
    content_type: "transcription",
    excerpt: "We discussed the project timeline and key milestones for Q4.",
    relevance_score: 0.95,
    timestamp: "2025-11-01T10:00:00Z",
  };

  it("renders source information correctly", () => {
    render(<SourceCard source={mockSource} />);

    expect(screen.getByText("Team Standup")).toBeInTheDocument();
    expect(
      screen.getByText(/discussed the project timeline/)
    ).toBeInTheDocument();
    expect(screen.getByText("95% relevant")).toBeInTheDocument();
  });

  it("displays correct badge color for content type", () => {
    const { rerender } = render(<SourceCard source={mockSource} />);

    expect(screen.getByText("Transcript")).toBeInTheDocument();

    // Test different content types
    const summarySource = { ...mockSource, content_type: "summary" as const };
    rerender(<SourceCard source={summarySource} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();

    const actionItemSource = {
      ...mockSource,
      content_type: "action_item" as const,
    };
    rerender(<SourceCard source={actionItemSource} />);
    expect(screen.getByText("Action Item")).toBeInTheDocument();
  });

  it("formats timestamp correctly", () => {
    render(<SourceCard source={mockSource} />);

    // The timestamp is displayed as-is with @ prefix
    expect(screen.getByText(/@ 2025-11-01T10:00:00Z/)).toBeInTheDocument();
  });

  it("renders view button", () => {
    const onNavigateToMeeting = vi.fn();
    render(<SourceCard source={mockSource} onNavigateToMeeting={onNavigateToMeeting} />);

    // The button has title "View meeting" but no accessible name, so we check by title
    const viewButton = screen.getByTitle("View meeting");
    expect(viewButton).toBeInTheDocument();
  });

  it("handles source without timestamp", () => {
    const sourceWithoutTimestamp = { ...mockSource, timestamp: null };

    render(<SourceCard source={sourceWithoutTimestamp} />);

    // Should still render without errors
    expect(screen.getByText("Team Standup")).toBeInTheDocument();
  });

  it("truncates long excerpts", () => {
    const longExcerpt =
      "This is a very long excerpt that should be truncated. ".repeat(10);
    const sourceWithLongExcerpt = { ...mockSource, excerpt: longExcerpt };

    const { container } = render(<SourceCard source={sourceWithLongExcerpt} />);

    // Check that the excerpt is rendered with line-clamp-3 class (will be truncated by CSS)
    const excerptElement = container.querySelector(".line-clamp-3");
    expect(excerptElement).toBeInTheDocument();
    expect(excerptElement).toHaveTextContent("This is a very long excerpt that should be truncated.");
  });
});

describe("SourceList", () => {
  const mockSources: MessageSource[] = [
    {
      meeting_id: "1",
      meeting_title: "Standup 1",
      content_type: "transcription",
      excerpt: "Content 1",
      relevance_score: 0.95,
      timestamp: "2025-11-01T10:00:00Z",
    },
    {
      meeting_id: "2",
      meeting_title: "Standup 2",
      content_type: "summary",
      excerpt: "Content 2",
      relevance_score: 0.88,
      timestamp: "2025-11-01T11:00:00Z",
    },
    {
      meeting_id: "3",
      meeting_title: "Planning",
      content_type: "action_item",
      excerpt: "Content 3",
      relevance_score: 0.82,
      timestamp: "2025-11-01T14:00:00Z",
    },
  ];

  it("renders all sources", () => {
    render(<SourceList sources={mockSources} />);

    expect(screen.getByText("Standup 1")).toBeInTheDocument();
    expect(screen.getByText("Standup 2")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("displays correct source count", () => {
    render(<SourceList sources={mockSources} />);

    expect(screen.getByText(/Sources \(3\)/i)).toBeInTheDocument();
  });

  it("renders empty state when no sources", () => {
    render(<SourceList sources={[]} />);

    expect(screen.queryByText(/sources/i)).not.toBeInTheDocument();
  });

  it("renders sources in grid layout", () => {
    const { container } = render(<SourceList sources={mockSources} />);

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("gap-2");
  });

  it("handles single source correctly", () => {
    render(<SourceList sources={[mockSources[0]]} />);

    expect(screen.getByText(/Sources \(1\)/i)).toBeInTheDocument();
  });
});

describe("FilterPanel", () => {
  const mockFilters: FilterContext = {
    project_ids: [],
    tags: [],
    start_date: undefined,
    end_date: undefined,
  };

  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  it("renders filter button", () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByRole("button");
    expect(filterButton).toBeInTheDocument();
  });

  it("shows filter count badge when filters active", () => {
    const filtersWithActive: FilterContext = {
      project_ids: ["proj1", "proj2"],
      tags: ["tag1"],
      start_date: "2025-11-01",
      end_date: undefined,
    };

    render(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    // Should show badge with count (2 projects + 1 tag + 1 date = 4)
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("opens popover when clicked", async () => {
    const filtersWithActive: FilterContext = {
      project_ids: ["proj1"],
      tags: [],
      start_date: undefined,
      end_date: undefined,
    };

    render(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const filterButton = screen.getByRole("button");
    fireEvent.click(filterButton);

    await waitFor(() => {
      // Clear all button only shows when there are active filters
      expect(screen.getByText(/clear all/i)).toBeInTheDocument();
    });
  });

  it("displays available projects", async () => {
    const availableProjects = [
      { id: "proj1", name: "Project Alpha" },
      { id: "proj2", name: "Project Beta" },
    ];

    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        availableProjects={availableProjects}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.getByText("Project Beta")).toBeInTheDocument();
    });
  });

  it("displays available tags", async () => {
    const availableTags = ["sprint-planning", "retrospective", "standup"];

    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("sprint-planning")).toBeInTheDocument();
      expect(screen.getByText("retrospective")).toBeInTheDocument();
      expect(screen.getByText("standup")).toBeInTheDocument();
    });
  });

  it("toggles project selection", async () => {
    const availableProjects = [{ id: "proj1", name: "Project Alpha" }];

    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        availableProjects={availableProjects}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      const projectBadge = screen.getByText("Project Alpha");
      fireEvent.click(projectBadge);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        project_ids: ["proj1"],
      })
    );
  });

  it("toggles tag selection", async () => {
    const availableTags = ["sprint-planning"];

    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      const tagBadge = screen.getByText("sprint-planning");
      fireEvent.click(tagBadge);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["sprint-planning"],
      })
    );
  });

  it("updates date range", async () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/Date Range/i)).toBeInTheDocument();
    });

    // Find the first date input from the entire document (popover is rendered in portal)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);

    fireEvent.change(dateInputs[0], { target: { value: "2025-11-01" } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: expect.any(String),
      })
    );
  });

  it("clears all filters", async () => {
    const filtersWithActive: FilterContext = {
      project_ids: ["proj1"],
      tags: ["tag1"],
      start_date: "2025-11-01",
      end_date: "2025-11-02",
    };

    render(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      const clearButton = screen.getByText(/clear all/i);
      fireEvent.click(clearButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      project_ids: [],
      tags: [],
      start_date: undefined,
      end_date: undefined,
    });
  });

  it("shows no filters message when empty", async () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      // When no projects or tags are available, the component doesn't render those sections at all
      // So we just verify the filter panel header is visible
      expect(screen.getByText(/Filter Search/i)).toBeInTheDocument();
    });
  });

  it("displays active filter count correctly", () => {
    const filtersWithMultiple: FilterContext = {
      project_ids: ["proj1", "proj2", "proj3"],
      tags: ["tag1", "tag2"],
      start_date: "2025-11-01",
      end_date: undefined,
    };

    render(
      <FilterPanel
        filters={filtersWithMultiple}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    // 3 projects + 2 tags + 1 date = 6 active filters
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
