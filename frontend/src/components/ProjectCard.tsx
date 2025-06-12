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
    <Card className="flex flex-col justify-between h-full"> 
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>Owner: {project.owner_id}</CardDescription>
        <CardDescription>Members: {project.members_ids.length}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow"> 
        <p className="text-sm text-gray-700 line-clamp-3"> 
          {project.description || "No description provided."}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-xs text-gray-500">Created: {formattedDate}</p>
        <Link to={`/projects/${project._id}`}> 
           <Button variant="link" className="p-0 h-auto">
              View Project
           </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default ProjectCard;