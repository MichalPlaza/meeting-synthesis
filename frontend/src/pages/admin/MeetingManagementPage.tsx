import { useState, useEffect, useCallback } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMeetingColumns } from "@/components/admin/meeting-columns";
import { DataTable } from "@/components/admin/data-table";
import { MeetingDetailsDialog } from "@/components/admin/meeting-details-dialog";
import { AddMeetingDialog } from "@/components/AddMeetingDialog";
import type { PopulatedMeeting } from "@/types/meeting";
import type { Project } from "@/types/project";
import { useAuth } from "@/AuthContext";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export default function MeetingManagementPage() {
  const [meetings, setMeetings] = useState<PopulatedMeeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<PopulatedMeeting | null>(null);
  const { token } = useAuth();

  const fetchMeetings = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/meetings/populated`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const data: PopulatedMeeting[] = await response.json();
      setMeetings(data);
      console.log(data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/project`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data: Project[] = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchMeetings();
    fetchProjects();
  }, [fetchMeetings, fetchProjects]);

  const handleViewDetails = (meeting: PopulatedMeeting) => {
    setSelectedMeeting(meeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!token) return;
    try {
      await fetch(`${BACKEND_API_BASE_URL}/meetings/${meetingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMeetings();
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const columns = getMeetingColumns({
    onViewDetails: handleViewDetails,
    onDelete: handleDeleteMeeting,
  });

  if (isLoading) {
    return <div>Loading meetings...</div>;
  }

  return (
    <div>
      {/* --- PAGE HEADER --- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Manage all meetings in the system. Total: {meetings.length}{" "}
            meetings.
          </p>
        </div>
        <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Meeting
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={meetings}
        filterColumnId="title"
        filterPlaceholder="Filter by title..."
        centeredColumns={["processing_status", "duration_seconds"]}
      />

      {selectedMeeting && (
        <MeetingDetailsDialog
          isOpen={!!selectedMeeting}
          onOpenChange={() => setSelectedMeeting(null)}
          meeting={selectedMeeting}
        />
      )}

      <AddMeetingDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        projects={projects}
        onMeetingAdded={() => {
          fetchMeetings();
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
}
