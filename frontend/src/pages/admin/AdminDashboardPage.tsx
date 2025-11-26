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
import { useAuth } from "@/contexts/AuthContext";
import { TimeSeriesChart } from "@/components/admin/TimeSeriesChart";
import log from "@/services/logging";
import { useApi } from "@/hooks/useApi";

interface DashboardStats {
  total_users: number;
  total_projects: number;
  total_meetings: number;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<7 | 30>(30);
  const { token } = useAuth();

  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useApi<DashboardStats>(
    `/admin/dashboard/stats`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: () => {
        log.info("Successfully fetched dashboard stats");
      },
      onError: () => {
        log.error("Error fetching dashboard stats");
      },
    }
  );

  // Fetch registrations chart data
  const { data: registrationsData, isLoading: isLoadingRegistrations, error: registrationsError } = useApi<{ data: ChartDataPoint[] }>(
    `/admin/dashboard/registrations-chart?period_days=${period}`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: () => {
        log.info(`Successfully fetched registrations chart for ${period} days`);
      },
      onError: () => {
        log.error("Error fetching registrations chart");
      },
    }
  );

  // Fetch meetings chart data
  const { data: meetingsData, isLoading: isLoadingMeetings, error: meetingsError } = useApi<{ data: ChartDataPoint[] }>(
    `/admin/dashboard/meetings-chart?period_days=${period}`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: () => {
        log.info(`Successfully fetched meetings chart for ${period} days`);
      },
      onError: () => {
        log.error("Error fetching meetings chart");
      },
    }
  );

  const isLoading = isLoadingStats || isLoadingRegistrations || isLoadingMeetings;
  const error = statsError || registrationsError || meetingsError;
  const registrationsChartData = registrationsData?.data || [];
  const meetingsChartData = meetingsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-center p-4">Error: {error.message}</div>
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
