import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMeetingColumns } from "@/components/admin/meeting-columns";
import { DataTable } from "@/components/admin/data-table";
import { MeetingDetailsDialog } from "@/components/admin/meeting-details-dialog";
import type { Meeting } from "@/types/meeting";

// --- FAKE DATA ---
const fakeMeetings: Meeting[] = [
  {
    _id: "6904817b99c323e42f8b4bf2",
    project_id: "6904816099c323e42f8b4bf1",
    title: "Q4 Planning Session",
    uploader_id: "6904814199c323e42f8b4bf0",
    meeting_datetime: "2025-10-31T09:29:31.267Z",
    uploaded_at: "2025-10-31T09:29:31.482Z",
    last_updated_at: "2025-10-31T09:29:31.482Z",
    audio_file: {
      original_filename: "Q4_Planning_Audio.mp3",
      storage_path_or_url: "/media/q4_planning.mp3",
      mimetype: "audio/mpeg",
    },
    processing_config: { language: "en", processing_mode_selected: "auto" },
    processing_status: {
      current_stage: "completed",
      completed_at: new Date().toISOString(),
      error_message: null,
    },
    transcription: {
      full_text: "Hello everyone, welcome to the Q4 planning session...",
    },
    ai_analysis: {
      summary:
        "The team discussed the main goals for Q4, focusing on product launch and marketing campaigns.",
      key_topics: [
        { topic: "Product Launch", details: null },
        { topic: "Marketing Strategy", details: null },
      ],
      action_items: [
        {
          description: "Alice to finalize the launch checklist.",
          assigned_to: "alice_id",
          due_date: null,
          user_comment: null,
        },
      ],
      decisions_made: [
        { description: "The launch date is confirmed for November 15th." },
      ],
      mentioned_dates: [],
    },
    duration_seconds: 1850,
    tags: ["planning", "q4", "strategy"],
  },
  {
    _id: "6904817b99c323e42f8b4bf3",
    project_id: "6904816099c323e42f8b4bf1",
    title: "Weekly Standup",
    uploader_id: "6904814199c323e42f8b4bf0",
    meeting_datetime: "2025-11-03T14:00:00.000Z",
    uploaded_at: "2025-11-03T14:05:00.000Z",
    last_updated_at: "2025-11-03T14:05:00.000Z",
    audio_file: {
      original_filename: "standup_nov_3.wav",
      storage_path_or_url: "/media/standup.wav",
      mimetype: "audio/wav",
    },
    processing_config: { language: "en", processing_mode_selected: "auto" },
    processing_status: {
      current_stage: "processing",
      completed_at: null,
      error_message: null,
    },
    transcription: null,
    ai_analysis: null,
    duration_seconds: null,
    tags: ["standup", "weekly"],
  },
  {
    _id: "6904817b99c323e42f8b4bf4",
    project_id: "6904816099c323e42f8b4bf1",
    title: "Client Demo Feedback",
    uploader_id: "user_id_2",
    meeting_datetime: "2025-10-29T11:30:00.000Z",
    uploaded_at: "2025-10-29T12:00:00.000Z",
    last_updated_at: "2025-10-29T12:00:00.000Z",
    audio_file: {
      original_filename: "client_feedback.mp3",
      storage_path_or_url: "/media/feedback.mp3",
      mimetype: "audio/mpeg",
    },
    processing_config: { language: "en", processing_mode_selected: "auto" },
    processing_status: {
      current_stage: "failed",
      completed_at: null,
      error_message: "Audio format not supported.",
    },
    transcription: null,
    ai_analysis: null,
    duration_seconds: 920,
    tags: ["client", "feedback"],
  },
];

export default function MeetingManagementPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setMeetings(fakeMeetings);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleViewDetails = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    console.log(`Deleting meeting ${meetingId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    setMeetings((prevMeetings) =>
      prevMeetings.filter((meeting) => meeting._id !== meetingId)
    );
    console.log("Meeting deleted successfully (mock)");
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
        <Button>
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
    </div>
  );
}
