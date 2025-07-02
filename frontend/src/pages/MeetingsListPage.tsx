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
// Usunięto import AddProjectDialog, bo nie jest już tutaj potrzebny

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function MeetingsListPage() {
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

  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [meetingsResponse, projectsResponse] = await Promise.all([
        fetch(`${BACKEND_API_BASE_URL}/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_API_BASE_URL}/project`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!meetingsResponse.ok || !projectsResponse.ok) {
        throw new Error("Failed to fetch data from the server.");
      }

      const meetingsData: Meeting[] = await meetingsResponse.json();
      const projectsData: Project[] = await projectsResponse.json();

      setMeetings(meetingsData);
      setProjects(projectsData);

      const uniqueTags = new Set(meetingsData.flatMap((m) => m.tags));
      setAllTags(Array.from(uniqueTags));
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const projectsMap = useMemo(
    () => new Map(projects.map((p) => [p._id, p])),
    [projects]
  );

  const filteredMeetings = useMemo(() => {
    return meetings
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
  }, [meetings, searchTerm, selectedProjects, selectedTags, sortBy]);

  if (error) {
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
          <Button onClick={() => setIsAddMeetingDialogOpen(true)}>
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