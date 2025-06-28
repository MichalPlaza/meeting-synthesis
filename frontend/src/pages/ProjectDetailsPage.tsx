import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MeetingListItem from "@/components/MeetingListItem";
import type { Project } from "@/types/project";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
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
            throw new Error("Session expired. Please log in again.");
          }
          throw new Error(
            `Failed to fetch project details (Status: ${projectResponse.status})`
          );
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
        setError(err.message || "Failed to connect to server.");
        setProject(null);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, token, logout, navigate]);

  if (loading) {
    return (
      <p className="text-center text-muted-foreground">
        Loading project details...
      </p>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-destructive">{error}</p>
        <Link to="/projects" className="mt-4 inline-block">
          <Button variant="outline">← Back to Projects</Button>
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <p className="text-center text-muted-foreground">
        Project details could not be loaded.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mt-4 border-b pb-4">
          <h2 className="text-3xl font-bold text-foreground">{project.name}</h2>
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold">Meetings</h3>
          {user && project.owner_id === user._id && (
            <Link to={`/projects/${projectId}/meetings/new`}>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" /> Add New Meeting
              </Button>
            </Link>
          )}
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">
              🎤 No meetings found for this project.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Click 'Add New Meeting' to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingListItem key={meeting._id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectDetailsPage;
