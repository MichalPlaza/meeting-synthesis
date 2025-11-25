import type { Meeting, PopulatedMeeting } from "@/types/meeting";

export const mockMeeting: PopulatedMeeting = {
  _id: "meeting-001",
  title: "Sprint Planning Meeting",
  meeting_datetime: "2024-01-20T10:00:00Z",
  uploaded_at: "2024-01-20T11:00:00Z",
  last_updated_at: "2024-01-20T12:00:00Z",
  project: {
    _id: "project-001",
    name: "Test Project",
  },
  uploader: {
    _id: "user-dev-001",
    username: "devuser",
    full_name: "Developer User",
  },
  audio_file: {
    original_filename: "sprint-planning.mp3",
    storage_path_or_url: "/audio/sprint-planning.mp3",
    mimetype: "audio/mpeg",
  },
  processing_config: {
    language: "en",
    processing_mode_selected: "full",
  },
  processing_status: {
    current_stage: "completed",
    completed_at: "2024-01-20T11:30:00Z",
    error_message: null,
  },
  transcription: {
    full_text:
      "This is the full transcription of the meeting. The team discussed sprint goals and assigned tasks.",
  },
  ai_analysis: {
    summary:
      "The team conducted a sprint planning session to discuss upcoming features and assign tasks for the next two weeks.",
    key_topics: [
      {
        topic: "Sprint Goals",
        details: "Define objectives for the upcoming sprint",
      },
      {
        topic: "Task Assignment",
        details: "Distribute work among team members",
      },
    ],
    action_items: [
      {
        description: "Complete user authentication feature",
        assigned_to: "devuser",
        due_date: "2024-01-27",
        user_comment: null,
      },
      {
        description: "Review API documentation",
        assigned_to: "smuser",
        due_date: "2024-01-25",
        user_comment: "High priority",
      },
    ],
    decisions_made: [
      { description: "Use JWT for authentication" },
      { description: "Sprint duration will be 2 weeks" },
    ],
    mentioned_dates: [
      { text_mention: "next Friday", parsed_date: "2024-01-27" },
    ],
  },
  duration_seconds: 3600,
  tags: ["sprint", "planning"],
  estimated_processing_time_seconds: 120,
};

export const mockMeeting2: PopulatedMeeting = {
  _id: "meeting-002",
  title: "Daily Standup",
  meeting_datetime: "2024-01-21T09:00:00Z",
  uploaded_at: "2024-01-21T09:30:00Z",
  last_updated_at: "2024-01-21T10:00:00Z",
  project: {
    _id: "project-001",
    name: "Test Project",
  },
  uploader: {
    _id: "user-sm-001",
    username: "smuser",
    full_name: "Scrum Master",
  },
  audio_file: {
    original_filename: "standup.mp3",
    storage_path_or_url: "/audio/standup.mp3",
    mimetype: "audio/mpeg",
  },
  processing_config: {
    language: "en",
    processing_mode_selected: "quick",
  },
  processing_status: {
    current_stage: "completed",
    completed_at: "2024-01-21T09:45:00Z",
    error_message: null,
  },
  transcription: {
    full_text: "Daily standup meeting. Team members shared their progress and blockers.",
  },
  ai_analysis: {
    summary: "Quick daily standup to sync team progress.",
    key_topics: [{ topic: "Progress Updates", details: null }],
    action_items: [],
    decisions_made: [],
    mentioned_dates: null,
  },
  duration_seconds: 900,
  tags: ["standup", "daily"],
  estimated_processing_time_seconds: 30,
};

export const mockProcessingMeeting: PopulatedMeeting = {
  _id: "meeting-003",
  title: "Meeting in Processing",
  meeting_datetime: "2024-01-22T14:00:00Z",
  uploaded_at: "2024-01-22T14:30:00Z",
  last_updated_at: "2024-01-22T14:30:00Z",
  project: {
    _id: "project-002",
    name: "Another Project",
  },
  uploader: {
    _id: "user-dev-001",
    username: "devuser",
    full_name: "Developer User",
  },
  audio_file: {
    original_filename: "processing-meeting.mp3",
    storage_path_or_url: "/audio/processing-meeting.mp3",
    mimetype: "audio/mpeg",
  },
  processing_config: {
    language: "en",
    processing_mode_selected: "full",
  },
  processing_status: {
    current_stage: "transcribing",
    completed_at: null,
    error_message: null,
  },
  transcription: null,
  ai_analysis: null,
  duration_seconds: null,
  tags: [],
  estimated_processing_time_seconds: 180,
};

export const mockMeetings: PopulatedMeeting[] = [
  mockMeeting,
  mockMeeting2,
  mockProcessingMeeting,
];

export const mockMeetingRaw: Meeting = {
  _id: "meeting-001",
  project_id: "project-001",
  title: "Sprint Planning Meeting",
  uploader_id: "user-dev-001",
  meeting_datetime: "2024-01-20T10:00:00Z",
  uploaded_at: "2024-01-20T11:00:00Z",
  last_updated_at: "2024-01-20T12:00:00Z",
  audio_file: {
    original_filename: "sprint-planning.mp3",
    storage_path_or_url: "/audio/sprint-planning.mp3",
    mimetype: "audio/mpeg",
  },
  processing_config: {
    language: "en",
    processing_mode_selected: "full",
  },
  processing_status: {
    current_stage: "completed",
    completed_at: "2024-01-20T11:30:00Z",
    error_message: null,
  },
  transcription: {
    full_text:
      "This is the full transcription of the meeting. The team discussed sprint goals and assigned tasks.",
  },
  ai_analysis: {
    summary:
      "The team conducted a sprint planning session to discuss upcoming features and assign tasks for the next two weeks.",
    key_topics: [
      {
        topic: "Sprint Goals",
        details: "Define objectives for the upcoming sprint",
      },
      {
        topic: "Task Assignment",
        details: "Distribute work among team members",
      },
    ],
    action_items: [
      {
        description: "Complete user authentication feature",
        assigned_to: "devuser",
        due_date: "2024-01-27",
        user_comment: null,
      },
      {
        description: "Review API documentation",
        assigned_to: "smuser",
        due_date: "2024-01-25",
        user_comment: "High priority",
      },
    ],
    decisions_made: [
      { description: "Use JWT for authentication" },
      { description: "Sprint duration will be 2 weeks" },
    ],
    mentioned_dates: [
      { text_mention: "next Friday", parsed_date: "2024-01-27" },
    ],
  },
  duration_seconds: 3600,
  tags: ["sprint", "planning"],
  estimated_processing_time_seconds: 120,
};
