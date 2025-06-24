import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; 
import { Button } from '@/components/ui/button';
import type { Project } from '@/types/project';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {

  const formattedDate = format(new Date(project.created_at), 'PP'); 

  return (
    <Card className="flex flex-col h-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold truncate">{project.name}</CardTitle>
        <CardDescription className="text-sm text-gray-800">
          Members: {project.members_ids.length}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow py-2">
        <p className="text-sm text-gray-800 line-clamp-3">
          {project.description || "No description provided."}
        </p>
      </CardContent>

      <CardFooter className="mt-auto flex justify-between items-center text-sm text-gray-800">
        <span className="text-xs">Created: {formattedDate}</span>
        <Link to={`/projects/${project._id}`}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default ProjectCard;