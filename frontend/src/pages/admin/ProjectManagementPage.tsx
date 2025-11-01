import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectColumns } from "@/components/admin/project-columns";
import { DataTable } from "@/components/admin/data-table";
import type { ProjectResponse, ProjectUpdate } from "@/types/project";
import { useAuth } from "@/AuthContext";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Mô phỏng việc cập nhật một project
  const handleUpdateProject = async (
    projectId: string,
    data: ProjectUpdate
  ) => {
    console.log(`Updating project ${projectId} with data:`, data);
    // Mô phỏng độ trễ API
    await new Promise((resolve) => setTimeout(resolve, 500));

    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p._id === projectId
          ? { ...p, ...data, updated_at: new Date().toISOString() }
          : p
      )
    );
    console.log("Project updated successfully (mock)");
  };

  // Mô phỏng việc xóa một project
  const handleDeleteProject = async (projectId: string) => {
    console.log(`Deleting project ${projectId}`);
    // Mô phỏng độ trễ API
    await new Promise((resolve) => setTimeout(resolve, 500));

    setProjects((prevProjects) =>
      prevProjects.filter((project) => project._id !== projectId)
    );
    console.log("Project deleted successfully (mock)");
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
        <Button>
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
    </div>
  );
}
