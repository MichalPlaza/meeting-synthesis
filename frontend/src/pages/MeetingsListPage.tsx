import { useState, useEffect, useMemo, useCallback } from "react";
import { type Project } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, Mic, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { MeetingListItemSkeleton } from "@/components/features/meetings/MeetingListItemSkeleton";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { AddMeetingDialog } from "@/components/features/meetings/AddMeetingDialog";
import { SearchFiltersPanel } from "@/components/features/search/SearchFiltersPanel";
import { SearchResultCard } from "@/components/features/search/SearchResultCard";
import log from "../services/logging";
import { api } from "@/lib/api/client";
import {
  searchMeetings,
  groupResultsByMeeting,
  type SearchResponse,
  type SearchFilters,
  type GroupedSearchResult,
} from "@/services/search";

function MeetingsListPage() {
  log.info("MeetingsListPage rendered.");
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { token, user } = useAuth();

  // Fetch projects for the user
  const fetchProjects = useCallback(async () => {
    if (!token || !user?._id) return;

    try {
      const projectsData = await api.get<Project[]>(
        `/project/member/${user._id}`,
        token
      );
      setProjects(projectsData);
      log.info(`Fetched ${projectsData.length} projects for user.`);
    } catch (e) {
      log.error("Failed to fetch projects:", e);
    }
  }, [token, user?._id]);

  // Perform search with current filters
  const performSearch = useCallback(async () => {
    if (!token) return;

    setSearching(true);

    try {
      const filters: SearchFilters = {
        q: debouncedSearchTerm,
        project_ids: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: pageSize,
      };

      const results = await searchMeetings(token, filters);
      setSearchResults(results);
      log.info(`Search returned ${results.total} results.`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Search failed.";
      log.error("Search error:", errorMessage);
      setError(errorMessage);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, [
    token,
    debouncedSearchTerm,
    selectedProjectIds,
    selectedTags,
    dateFrom,
    dateTo,
    page,
    pageSize,
  ]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchProjects();
  }, [fetchProjects]);

  // Perform search when filters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Reset to page 1 when filters change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, selectedProjectIds, selectedTags, dateFrom, dateTo]);

  // Listen for meeting processed events from WebSocket
  useEffect(() => {
    const handleMeetingProcessed = () => {
      log.info("Meeting processed event received, refreshing search...");
      performSearch();
    };

    window.addEventListener("meeting-processed", handleMeetingProcessed);
    return () => window.removeEventListener("meeting-processed", handleMeetingProcessed);
  }, [performSearch]);

  // Project lookup map
  const projectsMap = useMemo(
    () => new Map(projects.map((p) => [p._id, p])),
    [projects]
  );

  // Group search results by meeting_id to avoid duplicates
  const groupedResults = useMemo((): GroupedSearchResult[] => {
    if (!searchResults?.results) return [];
    return groupResultsByMeeting(searchResults.results);
  }, [searchResults?.results]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedProjectIds([]);
    setSelectedTags([]);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (searchResults && page < searchResults.total_pages) {
      setPage((p) => p + 1);
    }
  };

  if (error && !searchResults) {
    log.error("MeetingsListPage: Error state displayed.", error);
    return <ErrorState message={error} onRetry={performSearch} />;
  }

  const facets = searchResults?.facets ?? { projects: [], tags: [] };

  return (
    <>
      <AddMeetingDialog
        isOpen={isAddMeetingDialogOpen}
        onOpenChange={setIsAddMeetingDialogOpen}
        projects={projects}
        onMeetingAdded={performSearch}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <Button
            onClick={() => {
              setIsAddMeetingDialogOpen(true);
              log.debug("Add Meeting dialog opened.");
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Meeting
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Main Content with Sidebar Layout */}
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="hidden lg:block flex-shrink-0">
            <SearchFiltersPanel
              projects={projects}
              facets={facets}
              selectedProjectIds={selectedProjectIds}
              selectedTags={selectedTags}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onProjectChange={setSelectedProjectIds}
              onTagChange={setSelectedTags}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onClearFilters={handleClearFilters}
            />
          </aside>

          {/* Results */}
          <main className="flex-grow space-y-4">
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {searchResults
                  ? `${groupedResults.length} meetings found`
                  : "Loading..."}
              </p>
              {searchResults && searchResults.total_pages > 1 && (
                <p className="text-sm text-muted-foreground">
                  Page {searchResults.page} of {searchResults.total_pages}
                </p>
              )}
            </div>

            {/* Results List */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MeetingListItemSkeleton key={i} />
                ))}
              </div>
            ) : groupedResults.length > 0 ? (
              <div className="space-y-4">
                {groupedResults.map((result) => (
                  <SearchResultCard
                    key={result.meeting_id}
                    result={result}
                    project={projectsMap.get(result.project_id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Mic}
                title="No meetings found"
                description={
                  searchTerm || selectedProjectIds.length > 0 || selectedTags.length > 0 || dateFrom || dateTo
                    ? "No meetings match your current filters. Try adjusting your search."
                    : "No meetings available. Upload a new meeting to get started."
                }
              />
            )}

            {/* Pagination */}
            {searchResults && searchResults.total_pages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={page === 1 || searching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {searchResults.total_pages}
                </span>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={page >= searchResults.total_pages || searching}
                >
                  Next
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default MeetingsListPage;
