export interface Meeting {
  _id: string; 
  project_id: string; 
  title: string; 
  uploader_id: string;
  meeting_datetime: string; 
  // audio_file: {
  //   original_filename: string;
  //   storage_path_or_url: string;
  //   mimetype: string;
  // },
  // processing_config: {
  //   language: string;
  //   processing_mode_selected: string;
  // },
  // processing_status: {
  //   current_stage: string;
  //   completed_at: string;
  //   error_message: string;
  // },
  // transcription: {
  //   full_text: string;
  // },
  // ai_analysis: {
  //   summary: string;
  //   key_topics: [];
  //   action_items: [];
  //   decisions_made: [];
  //   mentioned_dates: []
  // },
  ai_summary?: string; // AI Summary text
  key_takeaways?: string; // Key Takeaways text (AI Summary in the image)
  action_items?: string; // Action Items text (can be text or structured data)
  decisions?: string; // Decisions text (can be text or structured data)
  full_transcript?: string; // Full transcript text
  audio_url: string;
  uploaded_at: string;
  last_updated_at: string;
}