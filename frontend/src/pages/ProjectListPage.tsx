import { useState, useEffect } from 'react';
import ProjectCard from '@/components/ProjectCard'; 
import AddProjectButton from '@/components/AddProjectButton'; 
import type { Project } from '@/types/project'; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';

const BACKEND_API_BASE_URL = 'http://localhost:8000';

function ProjectListPage() {
 
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  
  useEffect(() => {
    const fetchProjects = async () => {
      // Ensure token is available before fetching
      if (!token) {
        // Should be protected by ProtectedRoute, but safety check
        setError("Authentication token not available.");
        setLoading(false);
        // Optional: Redirect to login if token is missing
        // navigate('/login');
        return;
      }

      setLoading(true); // Start loading state
      setError(null); // Reset error state

      const projectsApiUrl = `${BACKEND_API_BASE_URL}/project`; // Backend API endpoint for projects list

      try {
        const response = await fetch(projectsApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`, // <<< Include the token in the header
            'Content-Type': 'application/json', // Good practice
          },
        });

        // Check if the response indicates an error (status code outside 2xx)
        if (!response.ok) {
           const errorData = await response.json();
           // Handle 401 Unauthorized specifically (token expired/invalid)
           if (response.status === 401) {
             setError("Session expired. Please log in again.");
             logout(); // Clear auth state in context and localStorage
             navigate('/login'); // Redirect to login page
           } else {
             // Handle other types of errors
             setError(errorData.detail || 'Failed to fetch projects.');
           }
           setProjects([]); // Clear previous projects on error
           return; // Stop execution if there was an error
        }

        // If response is OK (status 2xx)
        const data: Project[] = await response.json();
        setProjects(data); // <<< Update state with fetched projects

      } catch (err) {
        // Handle network errors or other exceptions during fetch
        console.error('Error fetching projects:', err);
        setError('Failed to connect to server to fetch projects.');
        setProjects([]); // Clear previous projects on network error
      } finally {
        // This block runs regardless of success or failure
        setLoading(false); // End loading state
      }
    };

    // Trigger the fetch operation only if the token is available
    if (token) {
      fetchProjects();
    } else {
       // If component renders without token (ProtectedRoute should handle this)
       setLoading(false);
       setError("User not authenticated.");
       // Optional: Redirect to login if component somehow renders without token despite ProtectedRoute
       // navigate('/login');
    }

  }, [token, logout, navigate]);

  return (
    <div className="relative">
      <h2 className="text-3xl font-bold mb-6">My Projects</h2>

      <div className="mb-6">
         <AddProjectButton />
      </div>

      {loading && <p className="text-center text-gray-600">Loading projects...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          {projects.length === 0 ? (
            <p className="text-center text-gray-600">No projects found. Click 'Add New Project' to get started!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> 
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProjectListPage;