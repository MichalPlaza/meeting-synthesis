import { Link } from 'react-router-dom'; 
import { Button } from '@/components/ui/button'; 
import { PlusIcon } from 'lucide-react';

function AddProjectButton() {

  const createProjectRoute = '/projects/new';

  return (
    <Button className="fixed bottom-10 right-6 p-5 shadow-lg z-50 bg-blue-600 hover:bg-blue-700 text-white">
      <Link to={createProjectRoute} className="flex items-center space-x-2">
        <PlusIcon size={20} /> 
        <span>Add New Project</span> 
      </Link>       
    </Button>
  );
}

export default AddProjectButton;