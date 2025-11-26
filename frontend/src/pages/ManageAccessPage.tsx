import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon, UserIcon, RefreshCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import log from "../services/logging";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

interface Developer {
  _id: string;
  username: string;
  email: string;
  full_name?: string;
  role?: string;
  is_approved: boolean;
  can_edit?: boolean;
}

function ManageAccessPage() {
  log.info("ManageAccessPage rendered.");
  const { token, user } = useAuth();

  const { data: developers, isLoading: loading, error, refetch: fetchDevelopers } = useApi<Developer[]>(
    `/users/by-manager/${user?._id}`,
    {
      enabled: !!token && !!user?._id,
      token: token || undefined,
      onSuccess: (data) => {
        log.info(`Fetched ${data.length} developers for manager ${user?._id}.`);
      },
      onError: () => {
        log.error("Error fetching developers");
      },
    }
  );

  const handleApprove = async (developerId: string) => {
    try {
      await api.patch(`/users/${developerId}/approve`, {}, token || undefined);
      log.info(`Approved developer ${developerId}.`);
      toast.success("Developer approved successfully");
      fetchDevelopers();
    } catch (e) {
      log.error("Error approving developer:", e instanceof Error ? e.message : "Unknown error");
      toast.error("Failed to approve developer");
    }
  };


  const handleRevoke = async (developerId: string) => {
    try {
      await api.patch(`/users/${developerId}/revoke`, {}, token || undefined);
      log.info(`Revoked access for developer ${developerId}.`);
      toast.success("Access revoked successfully");
      fetchDevelopers();
    } catch (e) {
      log.error("Error revoking developer:", e instanceof Error ? e.message : "Unknown error");
      toast.error("Failed to revoke access");
    }
  };

  const handleToggleEdit = async (developerId: string, currentValue: boolean) => {
    try {
      await api.patch(
        `/users/${developerId}/toggle-edit`,
        { can_edit: !currentValue },
        token || undefined
      );
      log.info(`Toggled can_edit for developer ${developerId} to ${!currentValue}`);
      toast.success(`Edit access ${!currentValue ? 'granted' : 'revoked'} successfully`);
      fetchDevelopers();
    } catch (e) {
      log.error("Error toggling edit access:", e instanceof Error ? e.message : "Unknown error");
      toast.error("Failed to toggle edit access");
    }
  };

  if (error) {
    return <ErrorState message={error.message} onRetry={fetchDevelopers} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCcw className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Developer Access</h1>
        <Button variant="outline" onClick={fetchDevelopers}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {!developers || developers.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title="No developers assigned"
          description="You currently don't have any developers under your management."
        />
      ) : (
        <ul className="divide-y border rounded-lg">
          {developers.map((dev) => (
            <li key={dev._id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {dev.full_name ? `${dev.full_name} (${dev.username})` : dev.username}
                </p>
                <p className="text-sm text-muted-foreground">{dev.email}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  Role: {dev.role || "unknown"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dev.is_approved ? "Approved" : "Pending approval"}
                </p>
              </div>

              <div className="flex gap-2">
                {!dev.is_approved && (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(dev._id)}
                    >
                      <CheckIcon className="mr-1 h-4 w-4"/> Approve
                    </Button>
                )}
                <Button
                    variant="destructive"
                  size="sm"
                  onClick={() => handleRevoke(dev._id)}
                >
                  <XIcon className="mr-1 h-4 w-4" /> Revoke
                </Button>
                <Button
                  variant={dev.can_edit ? "secondary" : "default"}
                  size="sm"
                  onClick={() => handleToggleEdit(dev._id, dev.can_edit)}
                >
                  {dev.can_edit ? "Revoke Edit Access" : "Grant Edit Access"}
                </Button>

              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ManageAccessPage;
