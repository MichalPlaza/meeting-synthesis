import { useState } from "react";
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
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  log.info("ProjectDetailsPage rendered for project ID:", projectId);
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch project details
  const { data: project, isLoading: isLoadingProject, error: projectError, refetch: refetchProject } = useApi<Project>(
    `/project/${projectId}`,
    {
      enabled: !!projectId && !!token,
      token: token || undefined,
      onSuccess: () => {
        log.info("Successfully fetched project details for ID:", projectId);
      },
      onError: () => {
        log.error("Error fetching project details for ID:", projectId);
      },
    }
  );

  // Fetch meetings for this project
  const { data: meetings, isLoading: isLoadingMeetings, error: meetingsError, refetch: refetchMeetings } = useApi<Meeting[]>(
    `/meetings/project/${projectId}`,
    {
      enabled: !!projectId && !!token,
      token: token || undefined,
      onSuccess: (data) => {
        log.info(`Fetched ${data.length} meetings for project ID: ${projectId}.`);
      },
      onError: () => {
        log.warn(`Could not fetch meetings for project ${projectId}`);
      },
    }
  );

  const loading = isLoadingProject || isLoadingMeetings;
  const error = projectError || meetingsError;
  const fetchProjectData = () => {
    refetchProject();
    refetchMeetings();
  };

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
      <ErrorState message={error.message} onRetry={fetchProjectData}>
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
        project={project!}
        onProjectUpdated={refetchProject}
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
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this project?")) {
                    try {
                      await api.delete(`/project/${project._id}`, token || undefined);
                      toast.success("Project deleted successfully");
                      navigate("/projects");
                    } catch (error) {
                      toast.error("Failed to delete project");
                      log.error("Error deleting project:", error);
                    }
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

        {!meetings || meetings.length === 0 ? (
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
