import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Meeting } from "@/types/meeting";
import { format } from "date-fns";

interface MeetingListItemProps {
  meeting: Meeting;
}

function MeetingListItem({ meeting }: MeetingListItemProps) {
  const formattedDatetime = format(new Date(meeting.meeting_datetime), "PPP p");

  return (
    <div className="flex justify-between items-center p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-lg font-semibold">{meeting.title}</h3>
        <p className="text-sm text-muted-foreground">
          Date & Time: {formattedDatetime}
        </p>
      </div>
      <Link to={`/meetings/${meeting._id}`}>
        <Button variant="secondary" size="sm">
          View Meeting
        </Button>
      </Link>
    </div>
  );
}

export default MeetingListItem;
