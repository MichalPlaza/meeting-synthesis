// src/pages/MeetingDetailsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Meeting } from '@/types/meeting'; // Import Meeting type
import { useAuth } from '@/AuthContext'; // Import useAuth
import { format } from 'date-fns'; // For formatting date/time

// Import Shadcn UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Using Card for sections

// Define backend API base URL
const BACKEND_API_BASE_URL = 'http://localhost:8000'; // Ensure this is correct

// === Hardcoded Data (Simulated) ===
// Simulate fetching a specific meeting's data
const HARDCODED_MEETING_DETAILS: Meeting[] = [
  {
    _id: "68592612ea00f2f41f04d35c", // Example ID matching a MeetingListItem
    project_id: "685918ff3c2c485cf180dd1c", // Example project ID
    title: "Campaign Review Meeting",
    meeting_datetime: "2024-07-26T10:00:00.000Z", // Example date/time
    uploaded_at: "2024-07-25T09:00:00.000Z",
    last_updated_at: "2024-07-26T11:00:00.000Z",
    ai_summary: "This meeting focused on the upcoming product launch...", // Example summary
    key_takeaways: "Key decisions included finalizing the launch date and assigning responsibilities for key tasks.", // Example takeaways
    action_items: "- Finalize marketing plan (Due: July 30, 2024, Assignee: Amelia Carter)\n- Allocate resources for launch event (Due: August 5, 2024, Assignee: Benjamin Foster)\n- Confirm launch date with stakeholders (Due: August 10, 2024, Assignee: Chloe Bennett)", // Example action items (as plain text with line breaks)
    decisions: "Launch date set for August 15, 2024\nAmelia Carter to lead marketing efforts\nBenjamin Foster to manage resource allocation", // Example decisions (as plain text with line breaks)
    full_transcript: "Speaker 1: Good morning, everyone. Let's discuss the product launch.\nSpeaker 2: I think we should aim for August 15th.\nSpeaker 3: Agreed. Amelia, can you lead the marketing?\nSpeaker 1: Benjamin, please allocate resources, Chloe, confirm the date with stakeholders.",
    uploader_id: '',
    audio_url: ''
  },
   {
    _id: "6859266dea00f2f41f04d35d", // Another example ID
    project_id: "685918ff3c2c485cf180dd1c",
    title: "Sprint 5 Daily Standup",
    meeting_datetime: "2023-10-29T10:00:00.000Z",
    uploaded_at: "2023-10-28T09:00:00.000Z",
    last_updated_at: "2023-10-28T09:00:00.000Z",
    ai_summary: "Daily standup updates...",
    key_takeaways: "Sprint progress reviewed, blockers discussed.",
    action_items: "- Update task status on Jira",
    decisions: "Proceed with current sprint tasks.",
    full_transcript: "Speaker 1: Yesterday I did X. Today I plan to do Y. No blockers.\nSpeaker 2: Yesterday I did A. Today I plan to do B. Blocked by C.",
    uploader_id: '',
    audio_url: ''
  }
  // Add more hardcoded meetings as needed for different IDs
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
      const foundMeeting = HARDCODED_MEETING_DETAILS.find(m => m._id === meetingId);

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
              <Link to="/projects" className="text-blue-600 hover:underline flex items-center space-x-1 justify-center mt-4">
               ← <span>Back to Projects</span>
             </Link>
          )}
       </div>
    );
  }

  // If meeting is not found after loading (should be covered by error state, but extra check)
  if (!meeting) {
      return <p className="text-center text-gray-600">Meeting details could not be loaded.</p>;
  }

  // Format date and time for header
  const processedDate = format(new Date(meeting.meeting_datetime), 'PPP, p'); // Example: July 26, 2024, 10:00 AM

  // Function to render text with line breaks
  const renderTextWithLineBreaks = (text: string | undefined) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />} {/* Add <br> for line breaks */}
      </React.Fragment>
    ));
  };

  // Render Meeting Details using Tabs
  return (
    <div className="container mx-auto p-6">
        <div className="mb-6">
             <Link to={`/projects/${meeting.project_id}`} className="text-blue-600 hover:underline inline-flex items-center space-x-1">
               ← <span>Back to Meetings List</span>
             </Link>
        </div>


      {/* Header */}
      <h2 className="text-3xl font-bold mb-2">Meeting: {meeting.title}</h2>
      <p className="text-gray-600 mb-6">Processed on {processedDate}</p> {/* Display formatted date/time */}

      {/* Tabs Section */}
      {/* Set a defaultValue for the first tab */}
      <Tabs defaultValue="ai-summary" className="w-full">
        {/* Tab List (Buttons/Triggers) */}
        <TabsList className="grid w-full grid-cols-4"> {/* Grid for 4 tabs */}
          <TabsTrigger value="ai-summary">AI Summary</TabsTrigger>
          <TabsTrigger value="action-items">Action Items</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="full-transcript">Full Transcript</TabsTrigger>
        </TabsList>

        {/* Tab Content */}

        {/* AI Summary Tab */}
        <TabsContent value="ai-summary">
           <Card className="mt-4"> {/* Optional: Wrap content in a Card */}
             <CardHeader>
               <CardTitle className="text-xl font-semibold">Key Takeaways</CardTitle>
             </CardHeader>
             <CardContent>
               {/* Display Key Takeaways text */}
               <p>{meeting.key_takeaways || "No key takeaways available."}</p>
               {/* Display AI Summary text */}
               <h4 className="text-lg font-semibold mt-4 mb-2">AI Generated Summary</h4>
                <p>{meeting.ai_summary || "No AI summary available."}</p>
             </CardContent>
           </Card>
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="action-items">
           <Card className="mt-4">
             <CardHeader>
               <CardTitle className="text-xl font-semibold">Action Items</CardTitle>
             </CardHeader>
             <CardContent>
               {/* Display Action Items text, preserving line breaks */}
               {/* TODO: If action_items is structured data, map over it to render checkboxes */}
               <p>{renderTextWithLineBreaks(meeting.action_items) || "No action items found."}</p>
                {/* Example if action_items was structured: */}
                {/* {meeting.action_items && meeting.action_items.length > 0 ? (
                  meeting.action_items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <Checkbox id={`action-item-${index}`} />
                      <label htmlFor={`action-item-${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {item.task}
                        {item.due_date && ` (Due: ${format(new Date(item.due_date), 'PPP')})`}
                        {item.assignee && ` (Assignee: ${item.assignee})`} // Might need to fetch assignee name
                      </label>
                    </div>
                  ))
                ) : (<p>No action items found.</p>)} */}
             </CardContent>
           </Card>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions">
          <Card className="mt-4">
             <CardHeader>
               <CardTitle className="text-xl font-semibold">Key Decisions</CardTitle>
             </CardHeader>
             <CardContent>
               {/* Display Decisions text, preserving line breaks */}
               {/* TODO: If decisions is structured data, map over it */}
               <p>{renderTextWithLineBreaks(meeting.decisions) || "No key decisions recorded."}</p>
             </CardContent>
           </Card>
        </TabsContent>

        {/* Full Transcript Tab */}
        <TabsContent value="full-transcript">
          <Card className="mt-4">
             <CardHeader>
               <CardTitle className="text-xl font-semibold">Full Transcript</CardTitle>
                {/* Optional: Audio Player */}
                {true && (
                    <div className="flex items-center space-x-4 mt-2">
                        {/* <img src="/placeholder-audio-icon.png" alt="Audio Icon" className="w-10 h-10" /> */}
                        <div className="flex-grow bg-gray-200 rounded-md h-10 flex items-center px-4">
                            <span>Meeting Recording</span>
                            <span className="ml-auto text-xs text-gray-600">{processedDate}</span>
                            <button className="ml-4 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </button>
                        </div>
                    </div>
                )}
             </CardHeader>
             <CardContent>
               {/* Display Full Transcript text, preserving line breaks */}
               {/* Using pre-wrap to handle whitespace and line breaks */}
               <div className="whitespace-pre-wrap">{meeting.full_transcript || "No transcript available."}</div>
             </CardContent>
           </Card>
        </TabsContent>

      </Tabs>

      {/* Optional: Add New Meeting Button (Only for project owner) - Usually on Project Details page, not Meeting Details */}
       {/* Optional: Edit/Delete Meeting Buttons (Only for project owner/creator) */}

    </div>
  );
}

export default MeetingDetailsPage;