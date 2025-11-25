import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MeetingListItem from "@/components/features/meetings/MeetingListItem";
import type { Project } from "@/types/project";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Mic, PlusIcon, FolderOpen } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import log from "../services/logging";
import {EditProjectDialog} from "@/components/features/projects/EditProjectDialog";
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  log.info("ProjectDetailsPage rendered for project ID:", projectId);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchProjectData = useCallback(async () => {
    log.debug("Fetching project data for ID:", projectId);
    if (!token || !projectId) {
      log.warn("Authentication token or Project ID is missing for fetchProjectData.");
      setError("Authentication token or Project ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const projectDetailsApiUrl = `${BACKEND_API_BASE_URL}/project/${projectId}`;
    const meetingsApiUrl = `${BACKEND_API_BASE_URL}/meetings/project/${projectId}`;

    try {
      const [projectResponse, meetingsResponse] = await Promise.all([
        fetch(projectDetailsApiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(meetingsApiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!projectResponse.ok) {
        if (projectResponse.status === 401) {
          log.warn("Project details fetch failed with 401. Logging out.");
          logout();
          navigate("/login");
        }
        log.error(`Failed to fetch project details for ID: ${projectId}. Status: ${projectResponse.status}`);
        throw new Error("Failed to fetch project details.");
      }
      const projectData: Project = await projectResponse.json();
      setProject(projectData);
      log.info("Successfully fetched project details for ID:", projectId);

      if (meetingsResponse.ok) {
        const meetingsData: Meeting[] = await meetingsResponse.json();
        setMeetings(meetingsData);
        log.info(`Fetched ${meetingsData.length} meetings for project ID: ${projectId}.`);
      } else {
        log.warn(`Could not fetch meetings for project ${projectId}. Status: ${meetingsResponse.status}`);
        setMeetings([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not connect to the server. Please try again.";
      log.error("Error fetching project data:", errorMessage);
      setError(errorMessage);
      setProject(null);
      setMeetings([]);
    } finally {
      setLoading(false);
      log.debug("Project data fetching completed. Loading set to false.");
    }
  }, [projectId, token, logout, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  if (loading) {
    log.debug("ProjectDetailsPage: Loading project details...");
    return (
      <p className="text-center text-muted-foreground">
        Loading project details...
      </p>
    );
  }

  if (error) {
    log.error("ProjectDetailsPage: Error state displayed.", error);
    return (
      <ErrorState message={error} onRetry={fetchProjectData}>
        <Button variant="outline" asChild>
          <Link to="/projects">← Projects</Link>
        </Button>
      </ErrorState>
    );
  }

  if (!project) {
    log.warn("ProjectDetailsPage: Project not found for ID:", projectId);
    return (
      <EmptyState
        icon={FolderOpen}
        title="Project Not Found"
        description="We couldn't find a project with the specified ID."
      />
    );
  }

  return (
    <div className="space-y-12">
      <EditProjectDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        project={project!} // tu przekazujemy cały obiekt projektu
        onProjectUpdated={(updatedProject) => setProject(updatedProject)}
      />

      <div className="mb-12">
        <Link
          to={`/projects`}
          className="subtle hover:text-foreground transition-colors"
        >
          ← Projects
        </Link>
      </div>

      <section>
        <div className="border-b pb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-4 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          {user && project.owner_id === user._id && (
            <div className="mt-4 sm:mt-0 flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this project?")) {
                    fetch(`${BACKEND_API_BASE_URL}/project/${project._id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then((res) => {
                        if (res.ok) navigate("/projects");
                        else alert("Failed to delete project");
                      })
                      .catch(() => alert("Error deleting project"));
                  }
                }}
              >
                Delete Project
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit Project
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Sekcja Meetings */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Meetings</h2>
          {user && project.owner_id === user._id && (
            <Link to={`/projects/${projectId}/meetings/new`}>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" /> Add New Meeting
              </Button>
            </Link>
          )}
        </div>

        {meetings.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No meetings found for this project"
            description="Add your first meeting to start generating insights."
          />
        ) : (
          <ul className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingListItem key={meeting._id} meeting={meeting} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ProjectDetailsPage;
