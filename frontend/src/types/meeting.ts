interface AudioFile {
  original_filename: string;
  storage_path_or_url: string;
  mimetype: string;
}

interface ProcessingConfig {
  language: string;
  processing_mode_selected: string;
}

interface ProcessingStatus {
  current_stage: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface Segment {
  start_time: number;
  end_time: number;
  text: string;
  speaker_label: string | null;
}

interface Transcription {
  full_text: string | null;
  segments: Segment[] | null;
}

export interface ActionItem {
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  user_comment: string | null;
}

export interface KeyTopic {
  topic: string;
  details: string | null;
}

export interface DecisionMade {
  description: string;
}

interface MentionedDate {
  text_mention: string;
  parsed_date: string | null;
}

interface AiAnalysis {
  summary: string | null;
  key_topics: KeyTopic[] | null;
  action_items: ActionItem[] | null;
  decisions_made: DecisionMade[] | null;
  mentioned_dates: MentionedDate[] | null;
}

export interface Meeting {
  _id: string;
  project_id: string;
  title: string;
  uploader_id: string;
  meeting_datetime: string;
  uploaded_at: string;
  last_updated_at: string;
  audio_file: AudioFile;
  processing_config: ProcessingConfig;
  processing_status: ProcessingStatus;
  transcription: Transcription | null;
  ai_analysis: AiAnalysis | null;
  duration_seconds: number | null;
  tags: string[];
  speaker_mappings: Record<string, string>;
  estimated_processing_time_seconds?: number | null;
}

interface PopulatedInfo {
  _id: string;
  name?: string;
  username?: string;
  full_name?: string;
}

export interface PopulatedMeeting
  extends Omit<Meeting, "project_id" | "uploader_id"> {
  project: PopulatedInfo;
  uploader: PopulatedInfo;
}
