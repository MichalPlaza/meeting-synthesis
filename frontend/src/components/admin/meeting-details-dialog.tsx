import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Meeting, PopulatedMeeting } from "@/types/meeting";

interface MeetingDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  meeting: PopulatedMeeting;
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return "N/A";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}m:${String(
    remainingSeconds
  ).padStart(2, "0")}s`;
};

export function MeetingDetailsDialog({
  isOpen,
  onOpenChange,
  meeting,
}: MeetingDetailsDialogProps) {
  const status = meeting.processing_status?.current_stage;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <DialogDescription>
            Meeting held on{" "}
            {new Date(meeting.meeting_datetime).toLocaleString()}.<br />
            Uploaded on {new Date(meeting.uploaded_at).toLocaleString()}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {/* AI Analysis Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2">AI Analysis</h3>
            <div className="p-4 border rounded-md bg-muted/50 space-y-4">
              <div>
                <h4 className="font-medium">Summary</h4>
                <p className="text-sm text-muted-foreground">
                  {meeting.ai_analysis?.summary ?? "No summary available."}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Key Topics</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {meeting.ai_analysis?.key_topics?.map((topic, index) => (
                    <li key={`${topic.topic}-${index}`}>{topic.topic}</li>
                  )) ?? <li>No key topics identified.</li>}
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Action Items</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {meeting.ai_analysis?.action_items?.map((item, index) => (
                    <li key={`${item.description}-${index}`}>{item.description}</li>
                  )) ?? <li>No action items found.</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Transcription Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Transcription</h3>
            <div className="p-4 border rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {meeting.transcription?.full_text ??
                  "Transcription not available."}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Details</h4>
            <div className="text-sm grid grid-cols-2 gap-2">
              <p>
                <strong>Original Filename:</strong>{" "}
                {meeting.audio_file.original_filename}
              </p>
              <p>
                <strong>Language:</strong> {meeting.processing_config.language}
              </p>
              <p>
                <strong>Duration:</strong>{" "}
                {meeting.duration_seconds
                  ? `${formatDuration(meeting.duration_seconds)}`
                  : "N/A"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge className="capitalize">{status}</Badge>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
