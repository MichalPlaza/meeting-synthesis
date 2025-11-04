/**
 * Knowledge Base API service
 */

import log from "./logging";
import type {
  Conversation,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from "@/types/knowledge-base";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;
const KB_BASE = `${BACKEND_API_BASE_URL}/api/v1/knowledge-base`;

/**
 * Helper to get auth headers
 */
function getAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Conversation Management
 */

export async function getConversations(token: string): Promise<Conversation[]> {
  try {
    const response = await fetch(`${KB_BASE}/conversations`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${KB_BASE}/conversations`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${KB_BASE}/conversations/${conversationId}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${KB_BASE}/conversations/${conversationId}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.statusText}`);
    }
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
    const response = await fetch(
      `${KB_BASE}/conversations/${conversationId}/messages`,
      {
        headers: getAuthHeaders(token),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${KB_BASE}/chat`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    log.error("Failed to send chat message", error);
    throw error;
  }
}

/**
 * Streaming Chat
 * Note: Streaming requires special handling - implement when needed
 */

export async function* sendMessageStream(
  token: string,
  request: ChatRequest
): AsyncGenerator<string, void, unknown> {
  try {
    // Use the same /chat endpoint with stream: true
    const response = await fetch(`${KB_BASE}/chat`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(token),
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
          try {
            // Backend sends data with single quotes, need to convert to double quotes
            const jsonData = data.replace(/'/g, '"');
            const parsed = JSON.parse(jsonData);

            if (parsed.type === "done") {
              return;
            } else if (parsed.type === "content" && parsed.content) {
              yield parsed.content;
            } else if (parsed.type === "conversation_id") {
              // Could store this if needed
              log.debug("Received conversation_id:", parsed.id);
            } else if (parsed.type === "sources") {
              // Could store sources if needed
              log.debug("Received sources");
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
    const response = await fetch(`${KB_BASE}/admin/reindex/${meetingId}`, {
      method: "POST",
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Failed to reindex meeting: ${response.statusText}`);
    }

    return await response.json();
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
    const url = new URL(`${KB_BASE}/admin/reindex-all`);
    if (projectId) {
      url.searchParams.append("project_id", projectId);
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk reindex: ${response.statusText}`);
    }

    return await response.json();
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
    const response = await fetch(`${KB_BASE}/admin/stats`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch index stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    log.error("Failed to fetch index stats", error);
    throw error;
  }
}
