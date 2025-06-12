export interface Meeting {
  id: string; // Meeting ID (ObjectId string)
  project_id: string; // ID of the parent project (ObjectId string)
  title: string; // Meeting title
  meeting_datetime: string; // Date and time (ISO string)
  // Add other meeting-related fields here as needed
  // transcript?: string;
  // summary?: string;
  created_at: string;
  updated_at: string;
}