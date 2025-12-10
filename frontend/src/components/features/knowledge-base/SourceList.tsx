/**
 * SourceList - Display a list of source references for a chat message
 */

import { FileSearch } from "lucide-react";
import { SourceCard } from "./SourceCard";
import type { MessageSource } from "@/types/knowledge-base";

interface SourceListProps {
  sources: MessageSource[];
  onNavigateToMeeting?: (meetingId: string) => void;
}

export function SourceList({ sources, onNavigateToMeeting }: SourceListProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FileSearch className="h-4 w-4" />
        <span>Sources ({sources.length})</span>
      </div>
      <div className="grid gap-2">
        {sources.map((source, index) => (
          <SourceCard
            key={`${source.meeting_id}-${index}`}
            source={source}
            onNavigateToMeeting={onNavigateToMeeting}
          />
        ))}
      </div>
    </div>
  );
}
