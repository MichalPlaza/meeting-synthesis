import { useState } from "react";
import ProjectCard from "@/components/features/projects/ProjectCard";
import type { Project } from "@/types/project";
import { useAuth } from "@/contexts/AuthContext";
import ProjectCardSkeleton from "@/components/features/projects/ProjectCardSkeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { FolderOpen, PlusIcon } from "lucide-react";
import { ProjectsToolbar } from "@/components/features/projects/ProjectsToolbar";
import { useDebounce } from "@/hooks/useDebounce";
import { AddProjectDialog } from "@/components/features/projects/AddProjectDialog";
import log from "../services/logging";
import { useApi } from "@/hooks/useApi";

function ProjectListPage() {
  log.info("ProjectListPage rendered.");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  useDebounce(searchTerm, 300);
  const { token, user } = useAuth();

  const { data: projects, isLoading: loading, error, refetch: fetchProjects } = useApi<Project[]>(
    `/project/member/${user?._id}`,
    {
      enabled: !!user?._id,
      token: token || undefined,
      onSuccess: (data) => {
        log.info(`Fetched ${data.length} projects where user is a member.`);
      },
      onError: () => {
        log.error("Error fetching member projects");
      },
    }
  );

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
          <Button onClick={() => {
            setIsAddDialogOpen(true);
            log.debug("Add Project dialog opened.");
            }}>
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
          <ErrorState message={error.message} onRetry={fetchProjects} />
        ) : loading ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </ul>
        ) : !projects || projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects found"
            description="No projects match your current filters, or you haven't created any yet."
          >
            <Button onClick={() => {
              setIsAddDialogOpen(true);
              log.debug("Create Project button clicked from empty state.");
              }}>
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
