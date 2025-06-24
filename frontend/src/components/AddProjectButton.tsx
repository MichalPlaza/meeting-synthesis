import { Link } from 'react-router-dom'; 
import { Button } from '@/components/ui/button'; 
import { PlusIcon } from 'lucide-react';

function AddProjectButton() {

  return (
    <Link to="/projects/new" className="fixed bottom-16 right-16 z-50">
      <Button
        className="p-7 shadow-lg bg-blue-900 hover:bg-blue-700 text-white flex items-center space-x-1"
      >
        <PlusIcon size={20} />
        <span className="hidden sm:inline">Add New Project</span>
      </Button>
    </Link>
  );
}
 
export default AddProjectButton;