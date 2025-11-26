/**
 * Conversation export utilities
 */

import type { ChatMessage, Conversation } from "@/types/knowledge-base";
import { format } from "date-fns";

export type ExportFormat = "markdown" | "json" | "text";

/**
 * Export conversation to markdown format
 */
export function exportToMarkdown(
  conversation: Conversation,
  messages: ChatMessage[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${conversation.title}`);
  lines.push("");
  lines.push(
    `*Created: ${format(new Date(conversation.created_at), "PPpp")}*`
  );
  lines.push(
    `*Last updated: ${format(new Date(conversation.updated_at), "PPpp")}*`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Messages
  messages.forEach((message, idx) => {
    const role = message.role === "user" ? "👤 You" : "🤖 Assistant";
    const timestamp = format(new Date(message.timestamp), "PPpp");

    lines.push(`## ${role} - ${timestamp}`);
    lines.push("");
    lines.push(message.content);
    lines.push("");

    // Sources if present
    if (message.sources && message.sources.length > 0) {
      lines.push("### Sources:");
      lines.push("");
      message.sources.forEach((source) => {
        lines.push(`- **${source.meeting_title}** (${source.content_type})`);
        lines.push(`  > ${source.excerpt}`);
        if (source.relevance_score) {
          lines.push(`  *Relevance: ${(source.relevance_score * 100).toFixed(1)}%*`);
        }
        lines.push("");
      });
    }

    if (idx < messages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  });

  return lines.join("\n");
}

/**
 * Export conversation to JSON format
 */
export function exportToJSON(
  conversation: Conversation,
  messages: ChatMessage[]
): string {
  const data = {
    conversation,
    messages,
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export conversation to plain text format
 */
export function exportToText(
  conversation: Conversation,
  messages: ChatMessage[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(conversation.title);
  lines.push("=".repeat(conversation.title.length));
  lines.push("");
  lines.push(`Created: ${format(new Date(conversation.created_at), "PPpp")}`);
  lines.push(
    `Last updated: ${format(new Date(conversation.updated_at), "PPpp")}`
  );
  lines.push("");
  lines.push("-".repeat(80));
  lines.push("");

  // Messages
  messages.forEach((message, idx) => {
    const role = message.role === "user" ? "YOU" : "ASSISTANT";
    const timestamp = format(new Date(message.timestamp), "PPpp");

    lines.push(`[${role}] ${timestamp}`);
    lines.push("");
    lines.push(message.content);
    lines.push("");

    if (message.sources && message.sources.length > 0) {
      lines.push("Sources:");
      message.sources.forEach((source) => {
        lines.push(`  - ${source.meeting_title} (${source.content_type})`);
      });
      lines.push("");
    }

    if (idx < messages.length - 1) {
      lines.push("-".repeat(80));
      lines.push("");
    }
  });

  return lines.join("\n");
}

/**
 * Download a file with given content
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation in specified format
 */
export function exportConversation(
  conversation: Conversation,
  messages: ChatMessage[],
  format: ExportFormat
) {
  const sanitizedTitle = conversation.title
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  const timestamp = format(new Date(), "yyyyMMdd_HHmmss");

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case "markdown":
      content = exportToMarkdown(conversation, messages);
      filename = `${sanitizedTitle}_${timestamp}.md`;
      mimeType = "text/markdown";
      break;

    case "json":
      content = exportToJSON(conversation, messages);
      filename = `${sanitizedTitle}_${timestamp}.json`;
      mimeType = "application/json";
      break;

    case "text":
      content = exportToText(conversation, messages);
      filename = `${sanitizedTitle}_${timestamp}.txt`;
      mimeType = "text/plain";
      break;
  }

  downloadFile(content, filename, mimeType);
}
