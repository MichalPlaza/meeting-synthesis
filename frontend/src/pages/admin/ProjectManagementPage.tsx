import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectColumns } from "@/components/admin/project-columns";
import { DataTable } from "@/components/admin/data-table";
import { AddProjectDialogAdmin } from "@/components/admin/AddProjectDialogAdmin";
import type { ProjectResponse, ProjectUpdate } from "@/types/project";
import { useAuth } from "@/contexts/AuthContext";
import log from "@/services/logging";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export default function ProjectManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { token } = useAuth();

  const { data: projects, isLoading, error, refetch: fetchProjects } = useApi<ProjectResponse[]>(
    `/project/populated`,
    {
      enabled: !!token,
      token: token || undefined,
      onSuccess: (data) => {
        log.info(`Fetched ${data.length} projects`);
      },
      onError: (error) => {
        log.error("Error fetching projects:", error.message);
      },
    }
  );

  const handleUpdateProject = async (
    projectId: string,
    data: ProjectUpdate
  ) => {
    log.debug(`Updating project ${projectId} with data:`, data);
    try {
      await api.put(`/project/${projectId}`, data, token || undefined);
      log.info("Project updated successfully on server.");
      toast.success("Project updated successfully");
      await fetchProjects();
    } catch (error) {
      log.error("Error updating project:", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    log.debug(`Deleting project ${projectId}`);
    try {
      await api.delete(`/project/${projectId}`, token || undefined);
      log.info("Project deleted successfully on server.");
      toast.success("Project deleted successfully");
      await fetchProjects();
    } catch (error) {
      log.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const columns = getProjectColumns({
    onUpdate: handleUpdateProject,
    onDelete: handleDeleteProject,
  });

  if (isLoading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div>
      {/* --- PAGE HEADER --- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage all projects in the system. Total: {projects?.length || 0}{" "}
            projects.
          </p>
        </div>
        <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Project
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={projects || []}
        filterColumnId="name"
        filterPlaceholder="Filter by name..."
        centeredColumns={["members", "created_at", "updated_at"]}
      />

      <AddProjectDialogAdmin
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onProjectCreated={() => {
          fetchProjects();
        }}
      />
    </div>
  );
}
