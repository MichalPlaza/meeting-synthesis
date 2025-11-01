import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Meeting } from "@/types/meeting";

interface MeetingDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  meeting: Meeting;
}

export function MeetingDetailsDialog({
  isOpen,
  onOpenChange,
  meeting,
}: MeetingDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <DialogDescription>
            Meeting held on{" "}
            {new Date(meeting.meeting_datetime).toLocaleString()}.
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
                    <li key={index}>{topic.topic}</li>
                  )) ?? <li>No key topics identified.</li>}
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Action Items</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {meeting.ai_analysis?.action_items?.map((item, index) => (
                    <li key={index}>{item.description}</li>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
