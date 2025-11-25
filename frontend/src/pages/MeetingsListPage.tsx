import { useState, useEffect, useMemo, useCallback } from "react";
import MeetingListItem from "@/components/MeetingListItem";
import { MeetingsToolbar } from "@/components/MeetingsToolbar";
import { type Meeting } from "@/types/meeting";
import { type Project } from "@/types/project";
import { Button } from "@/components/ui/button";
import { PlusIcon, Mic } from "lucide-react";
import { useAuth } from "@/AuthContext";
import { MeetingListItemSkeleton } from "@/components/MeetingListItemSkeleton";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { AddMeetingDialog } from "@/components/AddMeetingDialog";
import log from "../services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function MeetingsListPage() {
  log.info("MeetingsListPage rendered.");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");

  const { token, user } = useAuth();

  const fetchData = useCallback(async () => {
    log.debug("Fetching meetings for member projects...");
    if (!token || !user?._id) {
      log.warn("Cannot fetch data: missing token or user ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectsResponse = await fetch(
        `${BACKEND_API_BASE_URL}/project/member/${user._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!projectsResponse.ok) {
        log.error(
          "Failed to fetch member projects. Status:",
          projectsResponse.status
        );
        throw new Error("Failed to fetch member projects from the server.");
      }

      const projectsData: Project[] = await projectsResponse.json();
      setProjects(projectsData);

      const projectIds = projectsData.map((p) => p._id);

      const meetingsUrl = new URL(`${BACKEND_API_BASE_URL}/meetings`);
      projectIds.forEach((id) =>
        meetingsUrl.searchParams.append("project_ids", id)
      );

      const meetingsResponse = await fetch(meetingsUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meetingsResponse.ok) {
        log.error("Failed to fetch meetings. Status:", meetingsResponse.status);
        throw new Error("Failed to fetch meetings from the server.");
      }

      const meetingsData: Meeting[] = await meetingsResponse.json();
      setMeetings(meetingsData);

      const uniqueTags = new Set(meetingsData.flatMap((m) => m.tags));
      setAllTags(Array.from(uniqueTags));

      log.info(
        `Fetched ${meetingsData.length} meetings for ${projectsData.length} member projects. Found ${uniqueTags.size} unique tags.`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      log.error("Error fetching meetings for member projects:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      log.debug("Data fetching completed. Loading set to false.");
    }
  }, [token, user?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for meeting processed events from WebSocket
  useEffect(() => {
    const handleMeetingProcessed = (event: Event) => {
      const customEvent = event as CustomEvent<{
        meetingId: string;
        status: string;
      }>;
      log.info(
        "Meeting processed event received, refreshing data. Meeting ID:",
        customEvent.detail.meetingId
      );
      fetchData();
    };

    window.addEventListener("meeting-processed", handleMeetingProcessed);

    return () => {
      window.removeEventListener("meeting-processed", handleMeetingProcessed);
    };
  }, [fetchData]);

  const projectsMap = useMemo(
    () => new Map(projects.map((p) => [p._id, p])),
    [projects]
  );

  const filteredMeetings = useMemo(() => {
    log.debug("Filtering meetings based on current criteria.");
    const filtered = meetings
      .filter((meeting) => {
        const searchMatch =
          searchTerm.trim() === "" ||
          meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
        const projectMatch =
          selectedProjects.length === 0 ||
          selectedProjects.includes(meeting.project_id);
        const tagsMatch =
          selectedTags.length === 0 ||
          meeting.tags.some((tag) => selectedTags.includes(tag));
        return searchMatch && projectMatch && tagsMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "oldest":
            return (
              new Date(a.meeting_datetime).getTime() -
              new Date(b.meeting_datetime).getTime()
            );
          case "duration-desc":
            return (b.duration_seconds ?? 0) - (a.duration_seconds ?? 0);
          case "duration-asc":
            return (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0);
          case "newest":
          default:
            return (
              new Date(b.meeting_datetime).getTime() -
              new Date(a.meeting_datetime).getTime()
            );
        }
      });
    log.debug(`Filtered down to ${filtered.length} meetings.`);
    return filtered;
  }, [meetings, searchTerm, selectedProjects, selectedTags, sortBy]);

  if (error) {
    log.error("MeetingsListPage: Error state displayed.", error);
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <>
      <AddMeetingDialog
        isOpen={isAddMeetingDialogOpen}
        onOpenChange={setIsAddMeetingDialogOpen}
        projects={projects}
        onMeetingAdded={fetchData}
      />
      <div className="space-y-8">
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

        <MeetingsToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          availableProjects={projects.map((p) => ({
            value: p._id,
            label: p.name,
          }))}
          selectedProjects={selectedProjects}
          onSelectedProjectsChange={setSelectedProjects}
          availableTags={allTags.map((t) => ({ value: t, label: t }))}
          selectedTags={selectedTags}
          onSelectedTagsChange={setSelectedTags}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        <div className="space-y-4">
          <div className="px-1">
            <p className="text-sm text-muted-foreground">
              {filteredMeetings.length} of {meetings.length} meetings shown
            </p>
          </div>

          {loading ? (
            <ul className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <MeetingListItemSkeleton key={i} />
              ))}
            </ul>
          ) : filteredMeetings.length > 0 ? (
            <ul className="space-y-4">
              {filteredMeetings.map((meeting) => (
                <MeetingListItem
                  key={meeting._id}
                  meeting={meeting}
                  project={projectsMap.get(meeting.project_id)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Mic}
              title="No meetings found"
              description="No meetings match your current filters. Try adjusting your search."
            />
          )}
        </div>
      </div>
    </>
  );
}

export default MeetingsListPage;
