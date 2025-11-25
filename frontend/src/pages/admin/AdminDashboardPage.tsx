import { useEffect, useState } from "react";
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
import log from "@/services/logging";

interface DashboardStats {
  total_users: number;
  total_projects: number;
  total_meetings: number;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [registrationsChartData, setRegistrationsChartData] = useState<
    ChartDataPoint[]
  >([]);
  const [meetingsChartData, setMeetingsChartData] = useState<ChartDataPoint[]>(
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30>(30);

  const { token } = useAuth();

  useEffect(() => {
    const fetchAllDashboardData = async () => {
      if (!token) {
        setIsLoading(false);
        setError("Authentication token is missing.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [
          statsResponse,
          registrationsChartResponse,
          meetingsChartResponse,
        ] = await Promise.all([
          fetch(`${BACKEND_API_BASE_URL}/admin/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `${BACKEND_API_BASE_URL}/admin/dashboard/registrations-chart?period_days=${period}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(
            `${BACKEND_API_BASE_URL}/admin/dashboard/meetings-chart?period_days=${period}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        if (!statsResponse.ok)
          throw new Error(
            `Statistics fetch failed: ${statsResponse.statusText}`
          );
        if (!registrationsChartResponse.ok)
          throw new Error(
            `Registrations chart fetch failed: ${registrationsChartResponse.statusText}`
          );
        if (!meetingsChartResponse.ok)
          throw new Error(
            `Meetings chart fetch failed: ${meetingsChartResponse.statusText}`
          );

        const statsData: DashboardStats = await statsResponse.json();
        setStats(statsData);

        const registrationsData: { data: ChartDataPoint[] } =
          await registrationsChartResponse.json();
        setRegistrationsChartData(registrationsData.data);

        const meetingsData: { data: ChartDataPoint[] } =
          await meetingsChartResponse.json();
        setMeetingsChartData(meetingsData.data);
      } catch (err) {
        log.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllDashboardData();
  }, [token, period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-center p-4">Error: {error}</div>
    );
  }

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
            <div className="text-2xl font-bold">{stats?.total_users}</div>
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
            <div className="text-2xl font-bold">{stats?.total_projects}</div>
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
            <div className="text-2xl font-bold">{stats?.total_meetings}</div>
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
            type="button"
            variant={period === 7 ? "default" : "outline"}
            onClick={() => setPeriod(7)}
          >
            Last 7 Days
          </Button>
          <Button
            type="button"
            variant={period === 30 ? "default" : "outline"}
            onClick={() => setPeriod(30)}
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
                {period === 7 ? 7 : 30} days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={registrationsChartData} dataKey="count" />
            </CardContent>
          </Card>

          {/* Meetings Created */}
          <Card>
            <CardHeader>
              <CardTitle>Meetings Created</CardTitle>
              <CardDescription>
                Number of meetings uploaded in the last {period === 7 ? 7 : 30}{" "}
                days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart data={meetingsChartData} dataKey="count" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
