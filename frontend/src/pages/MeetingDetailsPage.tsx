// src/pages/MeetingDetailsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Meeting } from "@/types/meeting"; // Import Meeting type
import { useAuth } from "@/AuthContext"; // Import useAuth
import { format } from "date-fns"; // For formatting date/time

// Import Shadcn UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Using Card for sections
import { Checkbox } from "@/components/ui/checkbox";

// Define backend API base URL
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

// === Hardcoded Data (Simulated) ===
// Simulate fetching a specific meeting's data
const HARDCODED_MEETING_DETAILS: Meeting[] = [
  {
    _id: "68592612ea00f2f41f04d35c", // Example ID matching a MeetingListItem
    project_id: "685918ff3c2c485cf180dd1c", // Example project ID
    title: "Campaign Review Meeting",
    meeting_datetime: "2024-07-26T10:00:00.000Z",
    uploaded_at: "2024-07-25T09:00:00.000Z",
    last_updated_at: "2024-07-26T11:00:00.000Z",
    ai_summary:
      "This meeting centered around finalizing preparations for the Q3 product launch campaign. Team members reviewed previous campaign metrics, aligned on messaging, discussed target audience insights, and confirmed marketing channels. Specific dates and responsibilities were agreed upon to ensure a smooth rollout.",
    key_takeaways:
      "• Final launch date confirmed: August 15, 2024\n• Amelia Carter will lead all marketing operations\n• Resources and timeline for event planning have been approved",
    action_items:
      "1. Finalize marketing plan (Due: July 30, 2024, Assignee: Amelia Carter)\n2. Allocate resources for launch event (Due: August 5, 2024, Assignee: Benjamin Foster)\n3. Confirm launch date with stakeholders (Due: August 10, 2024, Assignee: Chloe Bennett)",
    decisions:
      "• Launch date set for August 15, 2024\n• Amelia Carter to oversee marketing execution\n• Benjamin Foster to manage resource allocation\n• Chloe Bennett to handle stakeholder communications",
    full_transcript:
      "Speaker 1: Good morning, everyone. Let's discuss the product launch campaign.\nSpeaker 2: I think we should aim for August 15th as the final date.\nSpeaker 3: That works. Amelia, can you take lead on marketing execution?\nSpeaker 2: Sure, I'll also finalize the plan by next week.\nSpeaker 1: Benjamin, please take care of logistics for the event.\nSpeaker 3: Noted. I’ll confirm venue and technical setup.\nSpeaker 1: Chloe, make sure our stakeholders are informed by early August.\nSpeaker 4: Will do. I’ll send out communications by the 10th.",
    uploader_id: "",
    audio_url: "",
  },
  {
    _id: "6859266dea00f2f41f04d35d",
    project_id: "685918ff3c2c485cf180dd1c",
    title: "Sprint 5 Daily Standup",
    meeting_datetime: "2023-10-29T10:00:00.000Z",
    uploaded_at: "2023-10-28T09:00:00.000Z",
    last_updated_at: "2023-10-28T09:00:00.000Z",
    ai_summary:
      "The team provided brief updates on their current tasks during Sprint 5. Progress was made across backend and frontend features. A blocker was raised regarding a database migration task. Action was taken to resolve this before the next standup.",
    key_takeaways:
      "• Most tasks are on track as planned\n• One blocker related to the database migration needs resolution\n• Communication across teams is effective",
    action_items:
      "1. Update task statuses on Jira (Assignee: All team members)\n2. Resolve database migration issue (Due: October 30, 2023, Assignee: Linh Tran)\n3. Confirm QA test scope for new feature (Due: October 30, 2023, Assignee: Alex Morgan)",
    decisions:
      "• Continue with current sprint plan\n• Database migration will be prioritized\n• QA team to prepare testing checklist by next sprint",
    full_transcript:
      "Speaker 1: Yesterday, I worked on the login API and finished integration testing. Today, I’ll start reviewing the analytics module. No blockers.\nSpeaker 2: I completed the frontend dashboard. Today, I’ll test the user profile edit. Blocked by pending database schema change.\nSpeaker 3: Backend tasks are progressing. I’ll help Linh resolve the migration issue.\nSpeaker 4: I’m preparing the QA checklist for new features and will sync with Alex later today.",
    uploader_id: "",
    audio_url: "",
  },
  {
    _id: "685a0508a39e3b1bb6430e34",
    project_id: "185918ff3c2c485cf180dd1c",
    title: "UX Design Review – Mobile App",
    meeting_datetime: "2025-05-14T14:30:00.000Z",
    uploaded_at: "2025-05-14T14:00:00.000Z",
    last_updated_at: "2025-05-14T15:10:00.000Z",
    ai_summary:
      "The design team reviewed the latest mobile app wireframes, focusing on user navigation, accessibility, and UI consistency. Feedback was collected on onboarding flow and visual hierarchy. Tasks were assigned for iterative improvements and usability testing.",
    key_takeaways:
      "• Onboarding screens need clearer progress indicators\n• Button size adjustments required for accessibility compliance\n• UI styling should follow updated branding guidelines",
    action_items:
      "1. Update onboarding flow with progress bar (Due: May 17, 2025, Assignee: Mia Thompson)\n2. Adjust button padding and font size (Due: May 18, 2025, Assignee: Ryan Park)\n3. Review updated design with branding team (Due: May 20, 2025, Assignee: Olivia Green)",
    decisions:
      "• Stick with the 4-step onboarding format\n• Use brand-approved color palette moving forward\n• Schedule usability testing for May 21 with internal team",
    full_transcript:
      "Speaker 1: Let’s walk through the new mobile onboarding.\nSpeaker 2: The navigation is smoother, but the progress isn’t obvious to users.\nSpeaker 3: I agree. Let’s add a progress bar to the top.\nSpeaker 2: Also, the CTA buttons are small—especially on older phones.\nSpeaker 1: Good point. Ryan, can you handle accessibility adjustments?\nSpeaker 3: Sure. I’ll also sync with Olivia for brand checks.\nSpeaker 4: Great. Let’s wrap and reconvene after usability tests.",
    uploader_id: "",
    audio_url: "",
  },
  {
    _id: "685a0593a39e3b1bb6430e39",
    project_id: "185918ff3c2c485cf180dd1c",
    title: "Infrastructure Upgrade Planning",
    meeting_datetime: "2025-06-10T11:00:00.000Z",
    uploaded_at: "2025-06-10T11:15:00.000Z",
    last_updated_at: "2025-06-10T12:00:00.000Z",
    ai_summary:
      "This meeting focused on the roadmap for server infrastructure upgrades. Discussions included cloud migration strategy, load testing, downtime mitigation, and cost estimation. The DevOps team proposed a phased rollout plan to reduce service interruptions.",
    key_takeaways:
      "• Initial migration phase will target non-critical services\n• Cloud provider: AWS selected based on cost and scalability\n• Peak traffic scenarios will be simulated before deployment",
    action_items:
      "1. Create migration checklist (Due: June 14, 2025, Assignee: Mark Reyes)\n2. Schedule load testing session (Due: June 16, 2025, Assignee: Sara Lin)\n3. Present cost breakdown to finance (Due: June 17, 2025, Assignee: David Chen)",
    decisions:
      "• Proceed with AWS for hosting\n• Follow 3-phase rollout: test → partial prod → full migration\n• Monitor SLA and rollback triggers closely during first phase",
    full_transcript:
      "Speaker 1: Today we’ll outline the migration steps.\nSpeaker 2: I recommend starting with dev services. It’s lower risk.\nSpeaker 3: AWS offers best autoscaling for our needs.\nSpeaker 1: Let’s test load on staging before going live.\nSpeaker 4: I’ll compile the cost estimate for next meeting.\nSpeaker 2: We also need a rollback plan in case things go sideways.\nSpeaker 3: I’ll work on SLA monitoring setup.",
    uploader_id: "",
    audio_url: "",
  },
];

function MeetingDetailsPage() {
  // Get meeting ID from the URL parameters (e.g., /meetings/meeting-a1 -> meetingId = "meeting-a1")
  const { meetingId } = useParams<{ meetingId: string }>(); // meetingId sẽ là string hoặc undefined
  const navigate = useNavigate();
  const { user, token, logout } = useAuth(); // Get user, token, logout for fetch and potential auth checks

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading=true
  const [error, setError] = useState<string | null>(null);

  // === Fetch Meeting Details from Backend API (Simulated) ===
  useEffect(() => {
    const fetchMeetingData = async () => {
      // Ensure token is available and meetingId is in URL params
      if (!token) {
        setError("Authentication token not available.");
        setLoading(false);
        return;
      }
      if (!meetingId) {
        setError("Meeting ID is missing in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true); // Start loading state
      setError(null); // Reset error state
      setMeeting(null); // Clear previous meeting data

      // === Simulate Fetching Data ===
      // In a real app, you would fetch from:
      // GET /meetings/{meetingId} (to get meeting details)
      // Remember to include the Authorization header with the token!

      // Simulate network delay
      // await new Promise(resolve => setTimeout(resolve, 500));

      // --- Simulate Finding Meeting ---
      const foundMeeting = HARDCODED_MEETING_DETAILS.find(
        (m) => m._id === meetingId
      );

      if (!foundMeeting) {
        // If meeting ID from URL doesn't match any hardcoded meeting
        setError(`Meeting with ID "${meetingId}" not found.`);
        setLoading(false);
        return; // Stop execution
      }

      setMeeting(foundMeeting); // Set hardcoded meeting details
      setLoading(false); // End loading

      // === COMMENT OUT ACTUAL API FETCH ===
      // const meetingApiUrl = `${BACKEND_API_BASE_URL}/meetings/${meetingId}`; // API to get specific meeting
      // try {
      //   const response = await fetch(meetingApiUrl, {
      //     method: 'GET',
      //     headers: {
      //       'Authorization': `Bearer ${token}`, // Include token
      //       'Content-Type': 'application/json',
      //     },
      //   });

      //   if (!response.ok) {
      //      const errorData = await response.json();
      //      if (response.status === 401) {
      //        setError("Session expired. Please log in again.");
      //        logout();
      //        navigate('/login');
      //      } else if (response.status === 403) {
      //         setError("You do not have permission to view this meeting.");
      //      } else if (response.status === 404) {
      //          setError(`Meeting with ID "${meetingId}" not found.`);
      //      } else {
      //        setError(errorData.detail || `Failed to fetch meeting details for ID "${meetingId}".`);
      //      }
      //      setLoading(false); // Stop loading on error
      //      return; // Stop execution if fetch failed
      //   }

      //   const meetingData: Meeting = await response.json();
      //   setMeeting(meetingData); // Update state with fetched meeting details
      //   setLoading(false); // End loading

      // } catch (err) {
      //   console.error(`Error fetching meeting ${meetingId}:`, err);
      //   setError('Failed to connect to server to fetch meeting data.');
      //   setLoading(false);
      // }
    };

    // Trigger the fetch operation only if meetingId and token are available
    fetchMeetingData();
  }, [meetingId, token, logout, navigate]); // Dependency array: Re-run effect if meetingId, token, or auth hooks change

  // --- Render Loading, Error, or Data ---
  if (loading) {
    return <p className="text-center">Loading meeting details...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-red-500">{error}</p>
        {/* Optional: Link back to project list if user is authenticated */}
        {token && (
          <Link
            to="/projects"
            className="text-blue-600 hover:underline flex items-center space-x-1 justify-center mt-4"
          >
            ← <span>Back to Projects</span>
          </Link>
        )}
      </div>
    );
  }

  // If meeting is not found after loading (should be covered by error state, but extra check)
  if (!meeting) {
    return (
      <p className="text-center text-gray-600">
        Meeting details could not be loaded.
      </p>
    );
  }

  // Format date and time for header
  const processedDate = format(new Date(meeting.meeting_datetime), "PPP, p"); // Example: July 26, 2024, 10:00 AM

  // Function to render text with line breaks
  const renderTextWithLineBreaks = (text: string | undefined) => {
    if (!text) return null;
    return text.split("\n").map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split("\n").length - 1 && <br />}{" "}
        {/* Add <br> for line breaks */}
      </React.Fragment>
    ));
  };

  // Render Meeting Details using Tabs
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          to={`/projects/${meeting.project_id}`}
          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2 text-m font-medium"
        >
          ← <span>Back to Meetings List</span>
        </Link>
      </div>
      {/* Header */}
      <h2 className="text-3xl font-bold mb-2">Meeting: {meeting.title}</h2>
      <p className="text-gray-600 mb-6">Processed on {processedDate}</p>{" "}
      {/* Display formatted date/time */}
      {/* Tabs Section */}
      {/* Set a defaultValue for the first tab */}
      <Tabs defaultValue="ai-summary" className="w-full">
        {/* Tab List (Buttons/Triggers) */}
        <TabsList className="grid w-full grid-cols-4">
          {" "}
          {/* Grid for 4 tabs */}
          <TabsTrigger value="ai-summary">AI Summary</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="full-transcript">Full Transcript</TabsTrigger>
        </TabsList>

        {/* Tab Content */}

        {/* AI Summary Tab */}
        <TabsContent value="ai-summary">
          <Card className="mt-4">
            {" "}
            {/* Optional: Wrap content in a Card */}
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                📝 Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line leading-loose">
                {meeting.key_takeaways || "No key takeaways available."}
              </p>
              <h4 className="text-lg font-semibold mt-4 mb-2">
                🤖 AI Generated Summary
              </h4>
              <p>{meeting.ai_summary || "No AI summary available."}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="action-items">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                ✅ Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Display Action Items text, preserving line breaks */}
              {/* TODO: If action_items is structured data, map over it to render checkboxes */}
              {/* <p>{renderTextWithLineBreaks(meeting.action_items) || "No action items found."}</p> */}
              {/* Example if action_items was structured: */}
              {meeting.action_items && meeting.action_items.length > 0 ? (
                meeting.action_items.split("\n").map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-7">
                    <Checkbox id={`action-item-${index}`} />
                    <label
                      htmlFor={`action-item-${index}`}
                      className="text-m leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {item}
                    </label>
                  </div>
                ))
              ) : (
                <p>No action items found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                📌 Key Decisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Display Decisions text, preserving line breaks */}
              {/* TODO: If decisions is structured data, map over it */}
              <p className="whitespace-pre-line leading-loose">
                {meeting.decisions || "No key decisions recorded."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Transcript Tab */}
        <TabsContent value="full-transcript">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                📄 Full Transcript
              </CardTitle>
              {/* Optional: Audio Player */}
              {true && (
                <div className="flex items-center space-x-4 mt-2">
                  {/* <img src="/placeholder-audio-icon.png" alt="Audio Icon" className="w-10 h-10" /> */}
                  <div className="flex-grow bg-gray-200 rounded-md h-10 flex items-center px-4">
                    <span>Meeting Recording</span>
                    <span className="ml-auto text-xs text-gray-600">
                      {processedDate}
                    </span>
                    <button className="ml-4 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-play"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* Display Full Transcript text, preserving line breaks */}
              {/* Using pre-wrap to handle whitespace and line breaks */}
              <div className="whitespace-pre-wrap ">
                {meeting.full_transcript || "No transcript available."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Optional: Add New Meeting Button (Only for project owner) - Usually on Project Details page, not Meeting Details */}
      {/* Optional: Edit/Delete Buttons (Only for project owner/creator) */}
    </div>
  );
}

export default MeetingDetailsPage;
