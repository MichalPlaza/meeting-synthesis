import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserColumns } from "@/components/admin/user-columns";
import { DataTable } from "@/components/admin/data-table";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import type { UserResponse, UserUpdate } from "@/types/user";
import { useAuth } from "@/AuthContext";
import log from "@/services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { token } = useAuth();

  const fetchUsers = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    const apiUrl = `${BACKEND_API_BASE_URL}/users`;
    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data: UserResponse[] = await response.json();
      setUsers(data);
    } catch (error) {
      log.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleUpdateUser = async (userId: string, data: UserUpdate) => {
    log.debug(`Updating user ${userId} with data:`, data);
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      log.info("User updated successfully");
      await fetchUsers();
    } catch (error) {
      log.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    log.debug(`Deleting user ${userId}`);
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      log.info("User deleted successfully");
      setUsers((prevUsers) => prevUsers.filter((user) => user._id !== userId));
    } catch (error) {
      log.error("Error deleting user:", error);
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
            Manage all users in the system. Total: {users.length} users.
          </p>
        </div>
        <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
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
