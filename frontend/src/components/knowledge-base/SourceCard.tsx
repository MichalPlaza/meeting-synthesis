/**
 * SourceCard - Display a single source reference from a chat message
 */

import { ExternalLink, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MessageSource } from "@/types/knowledge-base";

interface SourceCardProps {
  source: MessageSource;
  onNavigateToMeeting?: (meetingId: string) => void;
}

export function SourceCard({ source, onNavigateToMeeting }: SourceCardProps) {
  const contentTypeColors: Record<string, string> = {
    transcription:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    summary:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    key_topic:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    action_item:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    decision: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const contentTypeLabels: Record<string, string> = {
    transcription: "Transcript",
    summary: "Summary",
    key_topic: "Key Topic",
    action_item: "Action Item",
    decision: "Decision",
  };

  const relevancePercent = Math.round(source.relevance_score * 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h4 className="font-medium text-sm truncate">
              {source.meeting_title}
            </h4>
          </div>
          {onNavigateToMeeting && (
            <button
              onClick={() => onNavigateToMeeting(source.meeting_id)}
              className="flex-shrink-0 p-1 hover:bg-accent rounded transition-colors"
              title="View meeting"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="secondary"
            className={`text-xs ${
              contentTypeColors[source.content_type] || ""
            }`}
          >
            {contentTypeLabels[source.content_type] || source.content_type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {relevancePercent}% relevant
          </span>
          {source.timestamp && (
            <span className="text-xs text-muted-foreground">
              @ {source.timestamp}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {source.excerpt}
        </p>
      </CardContent>
    </Card>
  );
}
