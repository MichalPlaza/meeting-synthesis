import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserColumns } from "@/components/admin/user-columns";
import { DataTable } from "@/components/admin/data-table";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import type { UserResponse, UserUpdate } from "@/types/user";
import { useAuth } from "@/contexts/AuthContext";
import log from "@/services/logging";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export default function UserManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { token } = useAuth();

  const { data: users, isLoading, refetch: fetchUsers } = useApi<UserResponse[]>(
    `/users`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: (data) => {
        log.info(`Fetched ${data.length} users`);
      },
      onError: () => {
        log.error("Error fetching users");
      },
    }
  );

  const handleUpdateUser = async (userId: string, data: UserUpdate) => {
    log.debug(`Updating user ${userId} with data:`, data);
    try {
      await api.put(`/users/${userId}`, data, token || undefined);
      log.info("User updated successfully");
      toast.success("User updated successfully");
      await fetchUsers();
    } catch (error) {
      log.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    log.debug(`Deleting user ${userId}`);
    try {
      await api.delete(`/users/${userId}`, token || undefined);
      log.info("User deleted successfully");
      toast.success("User deleted successfully");
      await fetchUsers();
    } catch (error) {
      log.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const columns = getUserColumns({
    onUpdate: handleUpdateUser,
    onDelete: handleDeleteUser,
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div>
      {/* --- PAGE HEADER --- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage all users in the system. Total: {users?.length || 0} users.
          </p>
        </div>
        <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users || []}
        filterColumnId="username"
        filterPlaceholder="Filter by username..."
        centeredColumns={["role", "created_at", "updated_at"]}
      />

      <AddUserDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onUserCreated={() => {
          fetchUsers();
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
}
