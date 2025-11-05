import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectColumns } from "@/components/admin/project-columns";
import { DataTable } from "@/components/admin/data-table";
import { AddProjectDialogAdmin } from "@/components/admin/AddProjectDialogAdmin";
import type { ProjectResponse, ProjectUpdate } from "@/types/project";
import { useAuth } from "@/AuthContext";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { token } = useAuth();

  const fetchProjects = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/project/populated`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch projects. Status: ${response.status}`);
      }

      const data: ProjectResponse[] = await response.json();
      setProjects(data);
      console.info("Successfully fetched populated projects.");
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const handleUpdateProject = async (
    projectId: string,
    data: ProjectUpdate
  ) => {
    console.log(`Updating project ${projectId} with data:`, data);
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/project/${projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to update project: ${errorData.detail || response.statusText}`
        );
      }

      console.log("Project updated successfully on server.");

      await fetchProjects();
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    console.log(`Deleting project ${projectId}`);
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/project/${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to delete project: ${errorData.detail || response.statusText}`
        );
      }

      console.log("Project deleted successfully on server.");
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project._id !== projectId)
      );
    } catch (error) {
      console.error("Error deleting project:", error);
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
            Manage all projects in the system. Total: {projects.length}{" "}
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
        data={projects}
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
