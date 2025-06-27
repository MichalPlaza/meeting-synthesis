// src/pages/ProjectDetailsPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MeetingListItem from "@/components/MeetingListItem";
import type { Project } from "@/types/project"; // Import Project type
import type { Meeting } from "@/types/meeting"; // Import Meeting type
import { useAuth } from "@/AuthContext"; // Import useAuth
import { Button } from "@/components/ui/button";

// Define backend API base URL
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function ProjectDetailsPage() {
  // Get project ID from the URL parameters (e.g., /projects/project-123 -> projectId = "project-123")
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth(); // Get user, token, logout from useAuth

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading=true for both project and meetings
  const [error, setError] = useState<string | null>(null);

  // === Fetch Project Details and Meetings from Backend API ===
  useEffect(() => {
    const fetchProjectData = async () => {
      // Ensure token is available before fetching
      if (!token) {
        // Should be protected by ProtectedRoute, but safety check
        setError("Authentication token not available.");
        setLoading(false);
        // Optional: Redirect to login if token is missing
        // navigate('/login');
        return;
      }

      // Ensure projectId is available from URL params
      if (!projectId) {
        setError("Project ID is missing in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true); // Start loading state
      setError(null); // Reset error state
      setProject(null); // Clear previous project data
      setMeetings([]); // Clear previous meetings data

      // === Define API URLs ===
      const projectDetailsApiUrl = `${BACKEND_API_BASE_URL}/project/${projectId}`; // API to get specific project
      const meetingsApiUrl = `${BACKEND_API_BASE_URL}/meetings/project/${projectId}`; // API to get meetings for project (ASSUMING THIS API EXISTS)

      try {
        // --- Fetch Project Details ---
        const projectResponse = await fetch(projectDetailsApiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // <<< Include token
            "Content-Type": "application/json",
          },
        });

        // Handle errors for project details fetch
        if (!projectResponse.ok) {
          const errorData = await projectResponse.json();
          if (projectResponse.status === 401) {
            setError("Session expired. Please log in again.");
            logout();
            navigate("/login");
          } else if (projectResponse.status === 403) {
            // User is logged in but does not have access to this project
            setError("You do not have permission to view this project.");
            // Optional: Redirect to project list or 404
            // navigate('/projects');
          } else if (projectResponse.status === 404) {
            // Project not found with this ID
            setError(`Project with ID "${projectId}" not found.`);
            // Optional: Redirect to 404 page or project list
            // navigate('/404');
          } else {
            setError(
              errorData.detail ||
                `Failed to fetch project details for ID "${projectId}".`
            );
          }
          setLoading(false); // Stop loading on error
          return; // Stop execution if project fetch failed
        }

        // If project details fetch is OK
        const projectData: Project = await projectResponse.json();
        setProject(projectData); // Update state with fetched project details

        // --- Fetch Meetings for this Project ---
        const meetingsResponse = await fetch(meetingsApiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // <<< Include token again
            "Content-Type": "application/json",
          },
        });

        // Handle errors for meetings fetch
        if (!meetingsResponse.ok) {
          const errorData = await meetingsResponse.json();
          // Handle 401 specifically (should already be caught by project fetch, but check again)
          if (meetingsResponse.status === 401) {
            setError("Session expired. Please log in again.");
            logout();
            navigate("/login");
          } else if (meetingsResponse.status === 403) {
            // User not allowed to view meetings (though usually covered by project permission)
            setError(
              "You do not have permission to view meetings for this project."
            );
          } else {
            setError(
              errorData.detail ||
                `Failed to fetch meetings for project "${projectId}".`
            );
          }
          setMeetings([]); // Clear previous meetings on error
          // Continue rendering project details even if meetings fail to load
        } else {
          // If meetings fetch is OK
          const meetingsData: Meeting[] = await meetingsResponse.json();
          setMeetings(meetingsData); // Update state with fetched meetings
        }
      } catch (err) {
        // Handle network errors or other exceptions during fetch
        console.error(`Error fetching data for project ${projectId}:`, err);
        setError("Failed to connect to server to fetch project data.");
        // Clear previous data on network error
        setProject(null);
        setMeetings([]);
      } finally {
        // This block runs regardless of success or failure of *either* fetch
        setLoading(false); // End loading state
      }
    };

    // Trigger the fetch operation only if projectId and token are available
    // Adding token to dependencies ensures fetch happens if token changes
    fetchProjectData();
  }, [projectId, token, logout, navigate]); // <<< Dependency array: Re-run effect if projectId, token, or auth hooks change

  // --- Render Loading, Error, or Data ---
  if (loading) {
    return <p className="text-center">Loading project details...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-red-500">{error}</p>
        {error !== "Authentication token not available." && (
          <Link
            to="/projects"
            className="text-blue-600 hover:underline inline-flex items-center space-x-1 justify-center mt-4"
          >
            ← <span>Back to Projects</span>
          </Link>
        )}
      </div>
    );
  }

  // If project is not found after loading (should be covered by error state, but extra check)
  // This case should only happen if error is null but project is still null after !loading
  if (!project) {
    // This could happen if fetch failed but error state wasn't set correctly, or if projectId is initially undefined
    return (
      <p className="text-center text-gray-600">
        Project details could not be loaded.
      </p>
    );
  }

  // === Render Project Details and Meeting List ===
  return (
    <div className="container mx-auto px-4 md:px-8 py-6">
      {/* Back to Projects Link */}
      <div className="mb-4">
        <Link
          to="/projects"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2 text-m font-medium"
        >
          ← Back to Projects
        </Link>
      </div>

      <div className="mb-6">
        {/* Project Name */}
        <h2 className="text-3xl font-bold text-gray-900">{project.name}</h2>

        {/* Optional: Display other project details */}
        {project.description && (
          <p className="text-gray-700 mt-2 text-base leading-relaxed">
            <span className="font-semibold">Description:</span>{" "}
            {project.description}
          </p>
        )}
        <p>Members: {project.members_ids.length}</p>
        {/* You might want to fetch owner username/fullname from the /users API */}
        {/* {project.owner_id && <p>Owner: {getOwnerName(project.owner_id)}</p>} */}
      </div>

      {/* Meeting List Section */}
      <h3 className="text-2xl font-bold mt-8 mb-4">Meetings</h3>

      {meetings.length === 0 ? (
        <p className="text-gray-500 italic">
          No meetings found for this project.
        </p>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting) => (
            // Pass the meeting object to MeetingListItem
            <MeetingListItem key={meeting._id} meeting={meeting} />
          ))}
        </div>
      )}

      {user && project.owner_id === user._id && (
        <div className="mt-6">
          <Link to={`/projects/${projectId}/meetings/new`}>
            <Button>Add New Meeting</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProjectDetailsPage;
