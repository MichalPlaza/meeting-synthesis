import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProjectCard from "@/components/ProjectCard";
import AddProjectButton from "@/components/AddProjectButton";
import type { Project } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/AuthContext";
import ProjectCardSkeleton from "@/components/ProjectCardSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { FolderOpen, PlusIcon } from "lucide-react";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!token) {
      setError("Authentication token not available.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const projectsApiUrl = `${BACKEND_API_BASE_URL}/project`;
    try {
      const response = await fetch(projectsApiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          logout();
          navigate("/login");
        } else {
          setError(errorData.detail || "Failed to fetch projects.");
        }
        setProjects([]);
        return;
      }
      const data: Project[] = await response.json();
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(
        "Could not connect to the server. Please check your connection."
      );
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="relative">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">My Projects</h1>
      <AddProjectButton />

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
          description="Get started by creating your first project. Click the button below."
        >
          <Button asChild>
            <Link to="/projects/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Project
            </Link>
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
  );
}

export default ProjectListPage;
