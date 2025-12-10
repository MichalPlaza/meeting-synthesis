import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMeetingColumns } from "@/components/admin/meeting-columns";
import { DataTable } from "@/components/admin/data-table";
import { MeetingDetailsDialog } from "@/components/admin/meeting-details-dialog";
import { AddMeetingDialog } from "@/components/features/meetings/AddMeetingDialog";
import type { PopulatedMeeting } from "@/types/meeting";
import type { Project } from "@/types/project";
import { useAuth } from "@/contexts/AuthContext";
import log from "@/services/logging";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export default function MeetingManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<PopulatedMeeting | null>(null);
  const { token } = useAuth();

  const { data: meetings, isLoading: isLoadingMeetings, refetch: fetchMeetings } = useApi<PopulatedMeeting[]>(
    `/meetings/populated`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: (data) => {
        log.debug("Fetched meetings:", data.length);
      },
      onError: () => {
        log.error("Error fetching meetings");
      },
    }
  );

  const { data: projects } = useApi<Project[]>(
    `/project`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: (data) => {
        log.debug("Fetched projects:", data.length);
      },
      onError: () => {
        log.error("Error fetching projects");
      },
    }
  );

  const isLoading = isLoadingMeetings;

  const handleViewDetails = (meeting: PopulatedMeeting) => {
    setSelectedMeeting(meeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!token) return;
    try {
      await api.delete(`/meetings/${meetingId}`, token);
      log.info("Meeting deleted successfully");
      toast.success("Meeting deleted successfully");
      fetchMeetings();
    } catch (error) {
      log.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
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
            Manage all meetings in the system. Total: {meetings?.length || 0}{" "}
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
        data={meetings || []}
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
        projects={projects || []}
        onMeetingAdded={() => {
          fetchMeetings();
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
}
