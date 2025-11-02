import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, FolderKanban, BookUser } from "lucide-react";

interface Activity {
  id: string;
  activity_type: "USER_REGISTERED" | "PROJECT_CREATED" | "MEETING_UPLOADED";
  timestamp: string;
  details: {
    username?: string;
    projectName?: string;
    meetingTitle?: string;
    userFullName?: string;
  };
}

const fakeActivities: Activity[] = [
  {
    id: "1",
    activity_type: "MEETING_UPLOADED",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    details: { meetingTitle: "Weekly Sync", projectName: "Team Alpha" },
  },
  {
    id: "2",
    activity_type: "PROJECT_CREATED",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    details: { projectName: "Q4 Bug Report", username: "michal" },
  },
  {
    id: "3",
    activity_type: "USER_REGISTERED",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    details: { userFullName: "Piotr Branewski" },
  },
  {
    id: "4",
    activity_type: "USER_REGISTERED",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    details: { userFullName: "Jane Doe" },
  },
  {
    id: "5",
    activity_type: "PROJECT_CREATED",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    details: { projectName: "New Website Design", username: "khanhnam" },
  },
];

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

function ActivityItem({ activity }: { activity: Activity }) {
  let text = <></>;
  let icon = <Users className="h-4 w-4 text-muted-foreground" />;

  switch (activity.activity_type) {
    case "USER_REGISTERED":
      text = (
        <p>
          New user <strong>{activity.details.userFullName}</strong> has signed
          up.
        </p>
      );
      icon = <Users className="h-4 w-4 text-muted-foreground" />;
      break;
    case "PROJECT_CREATED":
      text = (
        <p>
          Project <strong>{activity.details.projectName}</strong> was created by{" "}
          <strong>{activity.details.username}</strong>.
        </p>
      );
      icon = <FolderKanban className="h-4 w-4 text-muted-foreground" />;
      break;
    case "MEETING_UPLOADED":
      text = (
        <p>
          Meeting <strong>{activity.details.meetingTitle}</strong> was uploaded
          to <strong>{activity.details.projectName}</strong>.
        </p>
      );
      icon = <BookUser className="h-4 w-4 text-muted-foreground" />;
      break;
    default:
      text = <p>An unknown activity occurred.</p>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        {icon}
      </div>
      <div className="grid gap-1">
        <div className="text-sm text-muted-foreground">{text}</div>
        <p className="text-xs text-muted-foreground">
          {formatTimeAgo(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

export function RecentActivity() {
  const activities = fakeActivities;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          A log of recent events that have occurred in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </CardContent>
    </Card>
  );
}
