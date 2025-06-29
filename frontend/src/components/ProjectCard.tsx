import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";
import { format } from "date-fns";

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  const formattedDate = format(new Date(project.created_at), "PP");

  return (
    <li className="list-none">
      <Card className="flex flex-col h-full bg-card rounded-[var(--radius-container)] shadow-md hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-4">
          <h2 className="text-lg font-semibold truncate">{project.name}</h2>
          <CardDescription className="text-sm text-muted-foreground pt-1">
            Members: {project.members_ids.length}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-grow py-0">
          <p className="text-sm text-foreground/80 line-clamp-3">
            {project.description || "No description provided."}
          </p>
        </CardContent>

        <CardFooter className="mt-auto flex justify-between items-center text-sm text-muted-foreground pt-6 border-t">
          <span className="text-xs">Created: {formattedDate}</span>
          <Link to={`/projects/${project._id}`}>
            <Button variant="secondary" size="sm">
              View Project
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </li>
  );
}

export default ProjectCard;
