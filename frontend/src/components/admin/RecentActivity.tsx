import { useEffect, useState } from "react";
import { useAuth } from "@/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, FolderKanban, BookUser, Loader2 } from "lucide-react";

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

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;
const RECENT_ACTIVITIES_LIMIT = 5;

const TIME_INTERVALS = {
  YEAR: 31536000,
  MONTH: 2592000,
  DAY: 86400,
  HOUR: 3600,
  MINUTE: 60,
} as const;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / TIME_INTERVALS.YEAR;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / TIME_INTERVALS.MONTH;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / TIME_INTERVALS.DAY;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / TIME_INTERVALS.HOUR;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / TIME_INTERVALS.MINUTE;
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
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!token) {
        setIsLoading(false);
        setError("Authentication token is missing.");
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `${BACKEND_API_BASE_URL}/admin/dashboard/recent-activities?limit=${RECENT_ACTIVITIES_LIMIT}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.statusText}`);
        }

        const data: { activities: Activity[] } = await response.json();
        setActivities(data.activities);
      } catch (err) {
        console.error("Error fetching recent activities:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [token]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            A log of recent events that have occurred in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            A log of recent events that have occurred in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            A log of recent events that have occurred in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activities.</p>
        </CardContent>
      </Card>
    );
  }

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
