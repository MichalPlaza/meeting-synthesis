import { Link } from "react-router-dom";
import type { Meeting } from "@/types/meeting";
import { format, formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Folder } from "lucide-react";
import { getTagColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/types/project";
import log from "@/services/logging";

interface MeetingListItemProps {
  meeting: Meeting;
  project?: Project;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function MeetingListItem({ meeting, project }: MeetingListItemProps) {
  log.debug("MeetingListItem rendered for meeting:", meeting.title);
  const formattedDate = format(
    new Date(meeting.meeting_datetime),
    "dd-MM-yyyy"
  );
  const timeAgo = formatDistanceToNow(new Date(meeting.meeting_datetime), {
    addSuffix: true,
  });

  return (
    <li className="list-none">
      <div className="flex items-start gap-4 p-4 bg-card rounded-[var(--radius-container)] [box-shadow:var(--shadow-sm)] transition-all hover:[box-shadow:var(--shadow-md)] hover:bg-muted/50">
        <div className="flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/meetings/${meeting._id}`} className="group">
              <h3 className="font-semibold text-base group-hover:underline">
                {meeting.title}
              </h3>
            </Link>
            {meeting.tags && meeting.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {meeting.tags.map((tag) => (
                  <Badge key={tag} variant={getTagColor(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5" title="Meeting Date">
              <span>
                {formattedDate} ({timeAgo})
              </span>
            </div>
            {project && (
              <div className="flex items-center gap-1.5" title="Project">
                <Folder className="h-3 w-3" />
                <Link
                  to={`/projects/${project._id}`}
                  className="hover:underline"
                >
                  {project.name}
                </Link>
              </div>
            )}
            {meeting.duration_seconds != null && (
              <div className="flex items-center gap-1.5" title="Duration">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(meeting.duration_seconds)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default MeetingListItem;
