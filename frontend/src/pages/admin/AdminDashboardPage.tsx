import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users, FolderKanban, BookUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";
import { TimeSeriesChart } from "@/components/admin/TimeSeriesChart";
import { RecentActivity } from "@/components/admin/RecentActivity";

// ======== MOCK DATA ========
interface DashboardStats {
  total_users: number;
  total_projects: number;
  total_meetings: number;
}

function generateMockTimeSeries(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      users: Math.floor(Math.random() * 15 + 5), // 5-20 users/day
      meetings: Math.floor(Math.random() * 30 + 10), // 10-40 meetings/day
    });
  }
  return data;
}

const last7DaysData = generateMockTimeSeries(7);
const last30DaysData = generateMockTimeSeries(30);

const mockStats = {
  total_users: last30DaysData.reduce((acc, d) => acc + d.users, 100),
  total_projects: 58,
  total_meetings: last30DaysData.reduce((acc, d) => acc + d.meetings, 500),
};

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const chartData = period === "7d" ? last7DaysData : last30DaysData;

  //   useEffect(() => {
  //     const fetchStats = async () => {
  //       if (!token) return;

  //       setIsLoading(true);
  //       try {
  //         const response = await fetch(
  //           `${BACKEND_API_BASE_URL}/admin/dashboard/stats`,
  //           {
  //             headers: { Authorization: `Bearer ${token}` },
  //           }
  //         );
  //         if (!response.ok) throw new Error("Failed to fetch stats");
  //         const data: DashboardStats = await response.json();
  //         setStats(data);
  //         console.info("Dashboard stats fetched successfully.");
  //       } catch (error) {
  //         console.error("Error fetching dashboard stats:", error);
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     };
  //     fetchStats();
  //   }, [token]);

  //   if (isLoading) {
  //     return <div>Loading dashboard...</div>;
  //   }

  //   if (!stats) {
  //     return <div>Could not load dashboard data.</div>;
  //   }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              All registered users in the system.
            </p>
          </CardContent>
        </Card>

        {/* Total Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.total_projects}</div>
            <p className="text-xs text-muted-foreground">
              All projects created by users.
            </p>
          </CardContent>
        </Card>

        {/* Total Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Meetings
            </CardTitle>
            <BookUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.total_meetings}</div>
            <p className="text-xs text-muted-foreground">
              All meetings uploaded for processing.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHART */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={period === "7d" ? "default" : "outline"}
            onClick={() => setPeriod("7d")}
          >
            Last 7 Days
          </Button>
          <Button
            variant={period === "30d" ? "default" : "outline"}
            onClick={() => setPeriod("30d")}
          >
            Last 30 Days
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* User Registrations */}
          <Card>
            <CardHeader>
              <CardTitle>New User Registrations</CardTitle>
              <CardDescription>
                Number of new users signed up in the last{" "}
                {period === "7d" ? 7 : 30} days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Truyền props mới, không cần lineColor */}
              <TimeSeriesChart data={chartData} dataKey="users" />
            </CardContent>
          </Card>

          {/* Meetings Created */}
          <Card>
            <CardHeader>
              <CardTitle>Meetings Created</CardTitle>
              <CardDescription>
                Number of meetings uploaded in the last{" "}
                {period === "7d" ? 7 : 30} days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={chartData} dataKey="meetings" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ACTIVITIES */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <RecentActivity />
      </div>
    </div>
  );
}
