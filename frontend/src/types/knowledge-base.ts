/**
 * Knowledge Base chat types
 */

export interface MessageSource {
  meeting_id: string;
  meeting_title: string;
  content_type:
    | "transcription"
    | "summary"
    | "key_topic"
    | "action_item"
    | "decision";
  excerpt: string;
  relevance_score: number;
  timestamp?: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: MessageSource[];
  timestamp: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface FilterContext {
  project_ids?: string[];
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  filters?: FilterContext;
  stream?: boolean;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  sources: MessageSource[];
}
