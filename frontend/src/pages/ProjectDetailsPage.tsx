import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; 
import MeetingListItem from '@/components/MeetingListItem';
import type { Project } from '@/types/project';
import type { Meeting } from '@/types/meeting'; 

const HARDCODED_PROJECTS: Project[] = [
  {
    _id: "project-123",
    name: "Marketing Strategy Q3",
    description: "Planning and execution strategy for Q3 marketing campaigns.",
    owner_id: "user-owner-abc",
    members_ids: ["user-owner-abc", "user-member-xyz", "user-member-123"],
    created_at: "2023-10-26T10:00:00.000Z",
    updated_at: "2023-10-27T11:00:00.000Z"
  },
  {
    _id: "project-456",
    name: "Product Development Sprint 5",
    description: "Focusing on new feature implementation and bug fixing for the next release.",
    owner_id: "user-owner-def",
    members_ids: ["user-owner-def", "user-member-abc"],
    created_at: "2023-10-20T09:00:00.000Z",
    updated_at: "2023-10-27T12:30:00.000Z"
  },
  {
    _id: "project-789",
    name: "Internal Tools Improvement",
    description: "Enhancing internal software tools for better team productivity.",
    owner_id: "user-owner-abc",
    members_ids: ["user-owner-abc", "user-member-456"],
    created_at: "2023-11-01T09:30:00.000Z",
    updated_at: "2023-11-03T15:00:00.000Z",
  }
];

const HARDCODED_MEETINGS: Meeting[] = [
  {
    id: "meeting-a1",
    project_id: "project-123", // Thuộc Marketing Strategy Q3
    title: "Q3 Planning Kickoff",
    meeting_datetime: "2023-10-28T14:00:00.000Z",
    created_at: "2023-10-27T09:00:00.000Z",
    updated_at: "2023-10-27T09:00:00.000Z"
  },
  {
    id: "meeting-a2",
    project_id: "project-123", // Thuộc Marketing Strategy Q3
    title: "Campaign Review Meeting",
    meeting_datetime: "2023-11-01T10:00:00.000Z",
    created_at: "2023-10-30T09:00:00.000Z",
    updated_at: "2023-10-30T09:00:00.000Z"
  },
  {
    id: "meeting-b1",
    project_id: "project-456", 
    title: "Sprint 5 Daily Standup",
    meeting_datetime: "2023-10-29T10:00:00.000Z",
    created_at: "2023-10-28T09:00:00.000Z",
    updated_at: "2023-10-28T09:00:00.000Z"
  },
   {
    id: "meeting-c1",
    project_id: "project-789", 
    title: "Tooling Sync",
    meeting_datetime: "2023-11-05T16:00:00.000Z",
    created_at: "2023-11-04T10:00:00.000Z",
    updated_at: "2023-11-04T10:00:00.000Z"
  }
];


function ProjectDetailsPage() {
  // Get project ID from the URL parameters (e.g., /projects/project-123 -> projectId = "project-123")
  const { projectId } = useParams<{ projectId: string }>(); 
  const navigate = useNavigate();
  // const { user, token, logout } = useAuth(); 

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  // === Simulate Data Loading ===
  useEffect(() => {
    setLoading(true); 
    setError(null); 

    // === Simulate Fetch Project Details and Meetings ===
    // In a real app, you would fetch from:
    // GET /projects/{projectId} (to get project details)
    // GET /projects/{projectId}/meetings (to get meetings for this project)
    // Remember to include the Authorization header with the token!

    const loadData = async () => {
        // Simulate network delay
        // await new Promise(resolve => setTimeout(resolve, 500));

        // --- Simulate Finding Project ---
        const foundProject = HARDCODED_PROJECTS.find(p => p._id === projectId);

        if (!foundProject) {
            // If project ID from URL doesn't match any hardcoded project
            setError(`Project with ID "${projectId}" not found.`);
            setLoading(false);
            setProject(null);
            setMeetings([]);
             // Optional: Redirect to 404 page or project list
             // navigate('/404');
             return;
        }

        setProject(foundProject); // Set hardcoded project details

        // --- Simulate Finding Meetings for this Project ---
        const projectMeetings = HARDCODED_MEETINGS.filter(m => m.project_id === projectId);
        setMeetings(projectMeetings); // Set hardcoded meetings

        setLoading(false); // End loading
    };

     // Check if projectId exists in URL params before attempting to load data
     if (projectId) {
        loadData();
     } else {
        // Handle case where projectId is missing in URL (should not happen with correct routing)
        setError("Project ID is missing in the URL.");
        setLoading(false);
        setProject(null);
        setMeetings([]);
        // Optional: Redirect to an error page or project list
        // navigate('/projects');
     }


  }, [projectId]); // Dependency array: re-run effect if projectId changes in the URL

  // Render loading, error, or data
  if (loading) {
    return <p className="text-center">Loading project details...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  // If project is not found after loading (should be covered by error state, but extra check)
  if (!project) {
      return <p className="text-center text-gray-600">Project details could not be loaded.</p>;
  }


  // === Render Project Details and Meeting List ===
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6"> 
        <Link to="/projects" className="text-blue-600 hover:underline flex items-center space-x-1">
          ← <span>Back to Projects</span>  
        </Link>
      </div>

      {/* Project Name */}
      <h2 className="text-3xl font-bold mb-6">{project.name}</h2>

      {/* Optional: Display other project details */}
      {/* <p>Description: {project.description}</p> */}
      {/* <p>Owner: {project.owner_id}</p> */}
      {/* <p>Members: {project.members_ids.length}</p> */}
      {/* <p>Created: {format(new Date(project.created_at), 'PP')}</p> */}


      {/* Meeting List Section */}
      <h3 className="text-2xl font-bold mt-8 mb-4">Meetings</h3>

      {meetings.length === 0 ? (
        <p className="text-gray-600">No meetings found for this project.</p>
      ) : (
        <div className="border rounded-md overflow-hidden"> {/* Border and overflow for the list container */}
          {meetings.map(meeting => (
            // Pass the meeting object to MeetingListItem
            <MeetingListItem key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}

      {/* Optional: Add New Meeting Button (Only for project owner) */}
       {/* You'll need to check if the current user is the project owner */}
       {/* {user && project.owner_id === (user._id || user.id) && ( */}
           {/* <div className="mt-6"> */}
               {/* <Link to={`/projects/${projectId}/meetings/new`}> */}
                 {/* <Button>Add New Meeting</Button> */}
               {/* </Link> */}
           {/* </div> */}
       {/* )} */}

    </div>
  );
}

export default ProjectDetailsPage;