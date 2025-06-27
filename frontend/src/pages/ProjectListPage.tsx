import { useState, useEffect } from "react";
import ProjectCard from "@/components/ProjectCard";
import AddProjectButton from "@/components/AddProjectButton";
import type { Project } from "@/types/project";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/AuthContext";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  useEffect(() => {
    const fetchProjects = async () => {
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
        setError("Failed to connect to server to fetch projects.");
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProjects();
    } else {
      setLoading(false);
      setError("User not authenticated.");
    }
  }, [token, logout, navigate]);

  return (
    <div className="relative">
      <h2 className="text-3xl font-bold mb-6">My Projects</h2>

      <AddProjectButton />

      {loading && (
        <p className="text-center text-muted-foreground">Loading projects...</p>
      )}
      {error && <p className="text-center text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          {projects.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">📂 No projects found.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Click the '+' button to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProjectListPage;
