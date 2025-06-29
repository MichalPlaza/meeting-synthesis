import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MeetingListItem from "@/components/MeetingListItem";
import type { Project } from "@/types/project";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";
import { Button } from "@/components/ui/button";
import { Mic, PlusIcon, FolderOpen } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!token || !projectId) {
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
          logout();
          navigate("/login");
        }
        throw new Error("Failed to fetch project details.");
      }
      const projectData: Project = await projectResponse.json();
      setProject(projectData);

      if (meetingsResponse.ok) {
        const meetingsData: Meeting[] = await meetingsResponse.json();
        setMeetings(meetingsData);
      } else {
        console.warn(`Could not fetch meetings for project ${projectId}.`);
        setMeetings([]);
      }
    } catch (err: any) {
      setError(
        err.message || "Could not connect to the server. Please try again."
      );
      setProject(null);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, token, logout, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  if (loading) {
    return (
      <p className="text-center text-muted-foreground">
        Loading project details...
      </p>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={fetchProjectData}>
        <Button variant="outline" asChild>
          <Link to="/projects">← Projects</Link>
        </Button>
      </ErrorState>
    );
  }

  if (!project) {
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
      <div className="mb-12">
        <Link
          to={`/projects`}
          className="subtle hover:text-foreground transition-colors"
        >
          ← Projects
        </Link>
      </div>

      <section>
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-4 max-w-2xl">
              {project.description}
            </p>
          )}
        </div>
      </section>

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
