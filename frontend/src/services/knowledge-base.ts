/**
 * Knowledge Base API service
 */

import log from "./logging";
import { api, getApiBaseUrl } from "@/lib/api/client";
import type {
  Conversation,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from "@/types/knowledge-base";

const KB_BASE_PATH = "/api/v1/knowledge-base";

/**
 * Conversation Management
 */

export async function getConversations(token: string): Promise<Conversation[]> {
  try {
    return await api.get<Conversation[]>(`${KB_BASE_PATH}/conversations`, token);
  } catch (error) {
    log.error("Failed to fetch conversations", error);
    throw error;
  }
}

export async function createConversation(
  token: string,
  title?: string
): Promise<Conversation> {
  try {
    return await api.post<Conversation>(`${KB_BASE_PATH}/conversations`, { title }, token);
  } catch (error) {
    log.error("Failed to create conversation", error);
    throw error;
  }
}

export async function getConversation(
  token: string,
  conversationId: string
): Promise<Conversation> {
  try {
    return await api.get<Conversation>(`${KB_BASE_PATH}/conversations/${conversationId}`, token);
  } catch (error) {
    log.error(`Failed to fetch conversation ${conversationId}`, error);
    throw error;
  }
}

export async function deleteConversation(
  token: string,
  conversationId: string
): Promise<void> {
  try {
    await api.delete(`${KB_BASE_PATH}/conversations/${conversationId}`, token);
  } catch (error) {
    log.error(`Failed to delete conversation ${conversationId}`, error);
    throw error;
  }
}

/**
 * Messages
 */

export async function getMessages(
  token: string,
  conversationId: string
): Promise<ChatMessage[]> {
  try {
    return await api.get<ChatMessage[]>(
      `${KB_BASE_PATH}/conversations/${conversationId}/messages`,
      token
    );
  } catch (error) {
    log.error(`Failed to fetch messages for ${conversationId}`, error);
    throw error;
  }
}

/**
 * Chat
 */

export async function sendMessage(
  token: string,
  request: ChatRequest
): Promise<ChatResponse> {
  try {
    return await api.post<ChatResponse>(`${KB_BASE_PATH}/chat`, request, token);
  } catch (error) {
    log.error("Failed to send chat message", error);
    throw error;
  }
}

/**
 * Streaming Chat Result Types
 */
export interface StreamResult {
  type: 'content' | 'sources' | 'conversation_id' | 'done';
  content?: string;
  sources?: MessageSource[];
  conversationId?: string;
}

/**
 * Streaming Chat
 * Note: Streaming requires special handling - implement when needed
 */

export async function* sendMessageStream(
  token: string,
  request: ChatRequest
): AsyncGenerator<StreamResult, void, unknown> {
  try {
    // Use the same /chat endpoint with stream: true
    // Note: Streaming requires native fetch, not our API client
    const response = await fetch(`${getApiBaseUrl()}${KB_BASE_PATH}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to stream message: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") {
            continue;
          }
          try {
            // Backend now sends proper JSON with double quotes
            const parsed = JSON.parse(data);

            if (parsed.type === "content" && parsed.content) {
              yield { type: 'content', content: parsed.content };
            } else if (parsed.type === "conversation_id") {
              log.debug("Received conversation_id:", parsed.id);
              yield { type: 'conversation_id', conversationId: parsed.id };
            } else if (parsed.type === "sources") {
              log.debug("Received sources");
              yield { type: 'sources', sources: parsed.sources };
            } else if (parsed.type === "done") {
              yield { type: 'done' };
              return;
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch (e) {
            log.warn("Failed to parse SSE data:", line, e);
          }
        }
      }
    }
  } catch (error) {
    log.error("Failed to stream chat message", error);
    throw error;
  }
}
/**
 * Admin Operations
 */

export async function reindexMeeting(
  token: string,
  meetingId: string
): Promise<{
  success: boolean;
  documents_indexed: number;
  message: string;
}> {
  try {
    return await api.post<{
      success: boolean;
      documents_indexed: number;
      message: string;
    }>(`${KB_BASE_PATH}/admin/reindex/${meetingId}`, {}, token);
  } catch (error) {
    log.error(`Failed to reindex meeting ${meetingId}`, error);
    throw error;
  }
}

export async function bulkReindex(
  token: string,
  projectId?: string
): Promise<{
  success: boolean;
  total_meetings: number;
  successful: number;
  failed: number;
}> {
  try {
    const endpoint = projectId
      ? `${KB_BASE_PATH}/admin/reindex-all?project_id=${projectId}`
      : `${KB_BASE_PATH}/admin/reindex-all`;

    return await api.post<{
      success: boolean;
      total_meetings: number;
      successful: number;
      failed: number;
    }>(endpoint, {}, token);
  } catch (error) {
    log.error("Failed to bulk reindex", error);
    throw error;
  }
}

export async function getIndexStats(token: string): Promise<{
  total_documents: number;
  total_meetings: number;
  by_content_type: Record<string, number>;
  index_size_bytes?: number;
}> {
  try {
    return await api.get<{
      total_documents: number;
      total_meetings: number;
      by_content_type: Record<string, number>;
      index_size_bytes?: number;
    }>(`${KB_BASE_PATH}/admin/stats`, token);
  } catch (error) {
    log.error("Failed to fetch index stats", error);
    throw error;
  }
}
