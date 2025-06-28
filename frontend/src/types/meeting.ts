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

interface Transcription {
  full_text: string | null;
}

interface ActionItem {
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  user_comment: string | null;
}

interface KeyTopic {
  topic: string;
  details: string | null;
}

interface DecisionMade {
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
}
