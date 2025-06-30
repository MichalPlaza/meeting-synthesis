import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProjectCard from "@/components/ProjectCard";
import type { Project } from "@/types/project";
import { useAuth } from "@/AuthContext";
import ProjectCardSkeleton from "@/components/ProjectCardSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { FolderOpen, PlusIcon } from "lucide-react";
import { ProjectsToolbar } from "@/components/ProjectsToolbar";
import { useDebounce } from "@/hooks/useDebounce";
import { AddProjectDialog } from "@/components/AddProjectDialog"; // <-- IMPORT

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false); // <-- NOWY STAN

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { token } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (debouncedSearchTerm) params.append("q", debouncedSearchTerm);
    params.append("sort_by", sortBy);

    const projectsApiUrl = `${BACKEND_API_BASE_URL}/project?${params.toString()}`;

    try {
      const response = await fetch(projectsApiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).detail || "Failed to fetch projects."
        );
      setProjects(await response.json());
    } catch (err: any) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearchTerm, sortBy]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <>
      <AddProjectDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onProjectCreated={fetchProjects}
      />
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>

        <ProjectsToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {error ? (
          <ErrorState message={error} onRetry={fetchProjects} />
        ) : loading ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </ul>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects found"
            description="No projects match your current filters, or you haven't created any yet."
          >
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default ProjectListPage;
