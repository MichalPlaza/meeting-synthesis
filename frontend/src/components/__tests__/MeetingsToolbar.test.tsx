import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeetingsToolbar } from "@/components/MeetingsToolbar";
import { server } from "@/test/mocks/server";

// Start MSW server for this test file (also provides localStorage polyfill)
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockProjects = [
  { value: "project-1", label: "Alpha Project" },
  { value: "project-2", label: "Beta Project" },
  { value: "project-3", label: "Gamma Project" },
];

const mockTags = [
  { value: "standup", label: "Standup" },
  { value: "retrospective", label: "Retrospective" },
  { value: "planning", label: "Planning" },
];

describe("MeetingsToolbar", () => {
  const defaultProps = {
    searchTerm: "",
    onSearchChange: vi.fn(),
    availableProjects: mockProjects,
    selectedProjects: [],
    onSelectedProjectsChange: vi.fn(),
    availableTags: mockTags,
    selectedTags: [],
    onSelectedTagsChange: vi.fn(),
    sortBy: "newest",
    onSortByChange: vi.fn(),
  };

  describe("Rendering", () => {
    it("renders search input with placeholder", () => {
      render(<MeetingsToolbar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search meetings/i);
      expect(searchInput).toBeInTheDocument();
    });

    it("renders Projects filter button", () => {
      render(<MeetingsToolbar {...defaultProps} />);

      expect(screen.getByRole("button", { name: /projects/i })).toBeInTheDocument();
    });

    it("renders Tags filter button", () => {
      render(<MeetingsToolbar {...defaultProps} />);

      expect(screen.getByRole("button", { name: /tags/i })).toBeInTheDocument();
    });

    it("renders Sort button", () => {
      render(<MeetingsToolbar {...defaultProps} />);

      expect(screen.getByRole("button", { name: /sort/i })).toBeInTheDocument();
    });

    it("displays search icon", () => {
      const { container } = render(<MeetingsToolbar {...defaultProps} />);

      // Search icon should be present (lucide-react svg)
      const searchIcon = container.querySelector("svg");
      expect(searchIcon).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("displays current search term", () => {
      render(<MeetingsToolbar {...defaultProps} searchTerm="test query" />);

      const searchInput = screen.getByPlaceholderText(/search meetings/i);
      expect(searchInput).toHaveValue("test query");
    });

    it("calls onSearchChange when typing", async () => {
      const onSearchChange = vi.fn();
      const user = userEvent.setup();

      render(<MeetingsToolbar {...defaultProps} onSearchChange={onSearchChange} />);

      const searchInput = screen.getByPlaceholderText(/search meetings/i);
      await user.type(searchInput, "test");

      expect(onSearchChange).toHaveBeenCalled();
      expect(onSearchChange).toHaveBeenCalledWith(expect.stringContaining("t"));
    });

    it("calls onSearchChange with empty string when cleared", async () => {
      const onSearchChange = vi.fn();
      const user = userEvent.setup();

      render(<MeetingsToolbar {...defaultProps} searchTerm="test" onSearchChange={onSearchChange} />);

      const searchInput = screen.getByPlaceholderText(/search meetings/i);
      await user.clear(searchInput);

      expect(onSearchChange).toHaveBeenCalledWith("");
    });
  });

  describe("Projects Filter", () => {
    it("opens dropdown when Projects button is clicked", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} />);

      const projectsButton = screen.getByRole("button", { name: /projects/i });
      await user.click(projectsButton);

      await waitFor(() => {
        expect(screen.getByText("Filter by project")).toBeInTheDocument();
      });
    });

    it("displays available projects in dropdown", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} />);

      const projectsButton = screen.getByRole("button", { name: /projects/i });
      await user.click(projectsButton);

      await waitFor(() => {
        expect(screen.getByText("Alpha Project")).toBeInTheDocument();
        expect(screen.getByText("Beta Project")).toBeInTheDocument();
        expect(screen.getByText("Gamma Project")).toBeInTheDocument();
      });
    });

    it("shows selection count badge when projects are selected", () => {
      render(<MeetingsToolbar {...defaultProps} selectedProjects={["project-1", "project-2"]} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("does not show badge when no projects are selected", () => {
      render(<MeetingsToolbar {...defaultProps} selectedProjects={[]} />);

      // Badge should not be visible
      const projectsButton = screen.getByRole("button", { name: /projects/i });
      expect(projectsButton).not.toHaveTextContent("0");
    });

    it("calls onSelectedProjectsChange when project is toggled", async () => {
      const onSelectedProjectsChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MeetingsToolbar
          {...defaultProps}
          onSelectedProjectsChange={onSelectedProjectsChange}
        />
      );

      const projectsButton = screen.getByRole("button", { name: /projects/i });
      await user.click(projectsButton);

      await waitFor(() => {
        const alphaProject = screen.getByText("Alpha Project");
        expect(alphaProject).toBeInTheDocument();
      });

      const alphaProject = screen.getByText("Alpha Project");
      await user.click(alphaProject);

      expect(onSelectedProjectsChange).toHaveBeenCalledWith(["project-1"]);
    });

    it("removes project from selection when unchecked", async () => {
      const onSelectedProjectsChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MeetingsToolbar
          {...defaultProps}
          selectedProjects={["project-1"]}
          onSelectedProjectsChange={onSelectedProjectsChange}
        />
      );

      const projectsButton = screen.getByRole("button", { name: /projects/i });
      await user.click(projectsButton);

      await waitFor(() => {
        const alphaProject = screen.getByText("Alpha Project");
        expect(alphaProject).toBeInTheDocument();
      });

      const alphaProject = screen.getByText("Alpha Project");
      await user.click(alphaProject);

      expect(onSelectedProjectsChange).toHaveBeenCalledWith([]);
    });
  });

  describe("Tags Filter", () => {
    it("opens dropdown when Tags button is clicked", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} />);

      const tagsButton = screen.getByRole("button", { name: /tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(screen.getByText("Filter by tag")).toBeInTheDocument();
      });
    });

    it("displays available tags in dropdown", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} />);

      const tagsButton = screen.getByRole("button", { name: /tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        expect(screen.getByText("Standup")).toBeInTheDocument();
        expect(screen.getByText("Retrospective")).toBeInTheDocument();
        expect(screen.getByText("Planning")).toBeInTheDocument();
      });
    });

    it("shows selection count badge when tags are selected", () => {
      render(<MeetingsToolbar {...defaultProps} selectedTags={["standup", "planning"]} />);

      // Should show badge with count 2
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("does not show badge when no tags are selected", () => {
      render(<MeetingsToolbar {...defaultProps} selectedTags={[]} />);

      // Badge should not be visible
      const tagsButton = screen.getByRole("button", { name: /tags/i });
      expect(tagsButton).not.toHaveTextContent("0");
    });

    it("calls onSelectedTagsChange when tag is toggled", async () => {
      const onSelectedTagsChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MeetingsToolbar
          {...defaultProps}
          onSelectedTagsChange={onSelectedTagsChange}
        />
      );

      const tagsButton = screen.getByRole("button", { name: /tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        const standupTag = screen.getByText("Standup");
        expect(standupTag).toBeInTheDocument();
      });

      const standupTag = screen.getByText("Standup");
      await user.click(standupTag);

      expect(onSelectedTagsChange).toHaveBeenCalledWith(["standup"]);
    });

    it("removes tag from selection when unchecked", async () => {
      const onSelectedTagsChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MeetingsToolbar
          {...defaultProps}
          selectedTags={["standup"]}
          onSelectedTagsChange={onSelectedTagsChange}
        />
      );

      const tagsButton = screen.getByRole("button", { name: /tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        const standupTag = screen.getByText("Standup");
        expect(standupTag).toBeInTheDocument();
      });

      const standupTag = screen.getByText("Standup");
      await user.click(standupTag);

      expect(onSelectedTagsChange).toHaveBeenCalledWith([]);
    });
  });

  describe("Sort Functionality", () => {
    it("opens dropdown when Sort button is clicked", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} />);

      const sortButton = screen.getByRole("button", { name: /sort/i });
      await user.click(sortButton);

      await waitFor(() => {
        expect(screen.getByText("Sort by")).toBeInTheDocument();
      });
    });

    it("displays all sort options", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} />);

      const sortButton = screen.getByRole("button", { name: /sort/i });
      await user.click(sortButton);

      await waitFor(() => {
        expect(screen.getByText("Newest")).toBeInTheDocument();
        expect(screen.getByText("Oldest")).toBeInTheDocument();
        expect(screen.getByText("Duration (Longest)")).toBeInTheDocument();
        expect(screen.getByText("Duration (Shortest)")).toBeInTheDocument();
      });
    });

    it("calls onSortByChange when sort option is selected", async () => {
      const onSortByChange = vi.fn();
      const user = userEvent.setup();

      render(<MeetingsToolbar {...defaultProps} onSortByChange={onSortByChange} />);

      const sortButton = screen.getByRole("button", { name: /sort/i });
      await user.click(sortButton);

      await waitFor(() => {
        const oldestOption = screen.getByText("Oldest");
        expect(oldestOption).toBeInTheDocument();
      });

      const oldestOption = screen.getByText("Oldest");
      await user.click(oldestOption);

      expect(onSortByChange).toHaveBeenCalledWith("oldest");
    });

    it("shows currently selected sort option", async () => {
      const user = userEvent.setup();
      render(<MeetingsToolbar {...defaultProps} sortBy="duration-desc" />);

      const sortButton = screen.getByRole("button", { name: /sort/i });
      await user.click(sortButton);

      await waitFor(() => {
        // The selected option should be present in the dropdown
        expect(screen.getByText("Duration (Longest)")).toBeInTheDocument();
      });
    });
  });

  describe("Multiple Selections", () => {
    it("allows multiple projects to be selected", async () => {
      const onSelectedProjectsChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MeetingsToolbar
          {...defaultProps}
          selectedProjects={["project-1"]}
          onSelectedProjectsChange={onSelectedProjectsChange}
        />
      );

      const projectsButton = screen.getByRole("button", { name: /projects/i });
      await user.click(projectsButton);

      await waitFor(() => {
        const betaProject = screen.getByText("Beta Project");
        expect(betaProject).toBeInTheDocument();
      });

      const betaProject = screen.getByText("Beta Project");
      await user.click(betaProject);

      expect(onSelectedProjectsChange).toHaveBeenCalledWith(["project-1", "project-2"]);
    });

    it("allows multiple tags to be selected", async () => {
      const onSelectedTagsChange = vi.fn();
      const user = userEvent.setup();

      render(
        <MeetingsToolbar
          {...defaultProps}
          selectedTags={["standup"]}
          onSelectedTagsChange={onSelectedTagsChange}
        />
      );

      const tagsButton = screen.getByRole("button", { name: /tags/i });
      await user.click(tagsButton);

      await waitFor(() => {
        const planningTag = screen.getByText("Planning");
        expect(planningTag).toBeInTheDocument();
      });

      const planningTag = screen.getByText("Planning");
      await user.click(planningTag);

      expect(onSelectedTagsChange).toHaveBeenCalledWith(["standup", "planning"]);
    });
  });

  describe("Empty States", () => {
    it("handles empty projects list", () => {
      render(<MeetingsToolbar {...defaultProps} availableProjects={[]} />);

      const projectsButton = screen.getByRole("button", { name: /projects/i });
      fireEvent.click(projectsButton);

      // Dropdown should open but have no project items
      expect(screen.queryByText("Alpha Project")).not.toBeInTheDocument();
    });

    it("handles empty tags list", () => {
      render(<MeetingsToolbar {...defaultProps} availableTags={[]} />);

      const tagsButton = screen.getByRole("button", { name: /tags/i });
      fireEvent.click(tagsButton);

      // Dropdown should open but have no tag items
      expect(screen.queryByText("Standup")).not.toBeInTheDocument();
    });
  });
});
