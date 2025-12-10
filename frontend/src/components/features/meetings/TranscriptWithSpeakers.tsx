import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit2, User } from "lucide-react";
import type { Segment } from "@/types/meeting";

// Speaker colors for visual distinction
const SPEAKER_COLORS = [
  "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
  "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
  "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
  "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700",
  "bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700",
  "bg-teal-100 border-teal-300 dark:bg-teal-900/30 dark:border-teal-700",
  "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
  "bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700",
];

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface TranscriptWithSpeakersProps {
  segments: Segment[];
  speakerMappings: Record<string, string>;
  onSpeakerMappingChange?: (mappings: Record<string, string>) => void;
  onSeekToTime?: (time: number) => void;
  readOnly?: boolean;
}

export function TranscriptWithSpeakers({
  segments,
  speakerMappings,
  onSpeakerMappingChange,
  onSeekToTime,
  readOnly = false,
}: TranscriptWithSpeakersProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Get unique speakers
  const uniqueSpeakers = Array.from(
    new Set(segments.map((s) => s.speaker_label).filter(Boolean) as string[])
  );

  // Assign colors to speakers
  const speakerColors: Record<string, string> = {};
  uniqueSpeakers.forEach((speaker, idx) => {
    speakerColors[speaker] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
  });

  // Get display name for speaker
  const getSpeakerName = (speakerId: string | null): string => {
    if (!speakerId) return "Unknown";
    return speakerMappings[speakerId] || speakerId;
  };

  // Group consecutive segments by speaker
  const groupedSegments: { speaker: string | null; segments: Segment[] }[] = [];
  let currentGroup: { speaker: string | null; segments: Segment[] } | null = null;

  for (const segment of segments) {
    if (currentGroup && currentGroup.speaker === segment.speaker_label) {
      currentGroup.segments.push(segment);
    } else {
      if (currentGroup) {
        groupedSegments.push(currentGroup);
      }
      currentGroup = { speaker: segment.speaker_label, segments: [segment] };
    }
  }
  if (currentGroup) {
    groupedSegments.push(currentGroup);
  }

  const handleEditSpeaker = (speakerId: string) => {
    setEditingSpeaker(speakerId);
    setEditingName(speakerMappings[speakerId] || "");
    setEditDialogOpen(true);
  };

  const handleSaveSpeakerName = () => {
    if (editingSpeaker && onSpeakerMappingChange) {
      const newMappings = {
        ...speakerMappings,
        [editingSpeaker]: editingName.trim() || editingSpeaker,
      };
      onSpeakerMappingChange(newMappings);
    }
    setEditDialogOpen(false);
    setEditingSpeaker(null);
  };

  if (segments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No transcript segments available.</p>
    );
  }

  // Check if any segments have speaker labels
  const hasSpeakers = segments.some((s) => s.speaker_label);

  if (!hasSpeakers) {
    // Fallback to simple transcript display
    return (
      <div className="space-y-2">
        {segments.map((segment, idx) => (
          <div
            key={idx}
            className="flex gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
            onClick={() => onSeekToTime?.(segment.start_time)}
          >
            <span className="text-muted-foreground font-mono text-xs w-12 flex-shrink-0">
              {formatTimestamp(segment.start_time)}
            </span>
            <span>{segment.text}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Speaker Legend */}
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground mr-2">Speakers:</span>
        {uniqueSpeakers.map((speaker) => (
          <button
            key={speaker}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm border ${speakerColors[speaker]} ${!readOnly ? "hover:opacity-80 cursor-pointer" : ""}`}
            onClick={() => !readOnly && handleEditSpeaker(speaker)}
            disabled={readOnly}
          >
            <User className="h-3 w-3" />
            <span>{getSpeakerName(speaker)}</span>
            {!readOnly && <Edit2 className="h-3 w-3 ml-1 opacity-50" />}
          </button>
        ))}
      </div>

      {/* Transcript */}
      <div className="space-y-4">
        {groupedSegments.map((group, groupIdx) => {
          const speakerId = group.speaker || "unknown";
          const speakerName = getSpeakerName(group.speaker);
          const colorClass = group.speaker
            ? speakerColors[group.speaker]
            : "bg-gray-100 border-gray-300 dark:bg-gray-800/30 dark:border-gray-600";

          const firstTimestamp = group.segments[0]?.start_time ?? 0;
          const combinedText = group.segments.map((s) => s.text).join(" ");

          return (
            <div
              key={groupIdx}
              className={`p-3 rounded-lg border-l-4 ${colorClass} cursor-pointer hover:opacity-90`}
              onClick={() => onSeekToTime?.(firstTimestamp)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{speakerName}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTimestamp(firstTimestamp)}
                </span>
              </div>
              <p className="text-sm">{combinedText}</p>
            </div>
          );
        })}
      </div>

      {/* Edit Speaker Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Speaker Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-muted-foreground">
              Change "{editingSpeaker}" to:
            </label>
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="Enter speaker name"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSpeakerName}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
