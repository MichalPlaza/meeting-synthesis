import type {
  Conversation,
  ChatMessage,
  ChatResponse,
} from "@/types/knowledge-base";

export const mockConversation: Conversation = {
  id: "conv-001",
  user_id: "user-dev-001",
  title: "Test Conversation",
  created_at: "2024-01-20T10:00:00Z",
  updated_at: "2024-01-20T11:00:00Z",
  message_count: 2,
};

export const mockConversation2: Conversation = {
  id: "conv-002",
  user_id: "user-dev-001",
  title: "Another Conversation",
  created_at: "2024-01-21T09:00:00Z",
  updated_at: "2024-01-21T10:00:00Z",
  message_count: 4,
};

export const mockConversations: Conversation[] = [
  mockConversation,
  mockConversation2,
];

export const mockChatMessage: ChatMessage = {
  id: "msg-001",
  conversation_id: "conv-001",
  role: "user",
  content: "What were the main decisions from the sprint planning meeting?",
  timestamp: "2024-01-20T10:00:00Z",
};

export const mockAssistantMessage: ChatMessage = {
  id: "msg-002",
  conversation_id: "conv-001",
  role: "assistant",
  content:
    "Based on the sprint planning meeting, there were two main decisions made:\n1. Use JWT for authentication\n2. Sprint duration will be 2 weeks",
  sources: [
    {
      meeting_id: "meeting-001",
      meeting_title: "Sprint Planning Meeting",
      content_type: "decision",
      excerpt: "Use JWT for authentication",
      relevance_score: 0.95,
    },
    {
      meeting_id: "meeting-001",
      meeting_title: "Sprint Planning Meeting",
      content_type: "decision",
      excerpt: "Sprint duration will be 2 weeks",
      relevance_score: 0.92,
    },
  ],
  timestamp: "2024-01-20T10:00:05Z",
};

export const mockChatMessages: ChatMessage[] = [
  mockChatMessage,
  mockAssistantMessage,
];

export const mockChatResponse: ChatResponse = {
  conversation_id: "conv-001",
  message_id: "msg-003",
  response:
    "Based on the sprint planning meeting, the main decisions were to use JWT for authentication and set sprint duration to 2 weeks.",
  sources: [
    {
      meeting_id: "meeting-001",
      meeting_title: "Sprint Planning Meeting",
      content_type: "decision",
      excerpt: "Use JWT for authentication",
      relevance_score: 0.95,
    },
  ],
};
