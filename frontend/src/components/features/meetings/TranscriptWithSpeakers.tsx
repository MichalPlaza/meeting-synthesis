import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, User, Merge, Check, X } from "lucide-react";
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
  onMergeSpeakers?: (source: string, target: string) => Promise<void>;
  readOnly?: boolean;
  // Edit mode props
  isEditing?: boolean;
  onSegmentsChange?: (segments: Segment[]) => void;
}

export function TranscriptWithSpeakers({
  segments,
  speakerMappings,
  onSpeakerMappingChange,
  onSeekToTime,
  onMergeSpeakers,
  readOnly = false,
  isEditing = false,
  onSegmentsChange,
}: TranscriptWithSpeakersProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Merge speakers state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<string>("");
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);

  // Segment editing state
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Group consecutive segments by speaker (for view mode)
  const groupedSegments: { speaker: string | null; segments: Segment[]; startIndex: number }[] = [];
  let currentGroup: { speaker: string | null; segments: Segment[]; startIndex: number } | null = null;

  segments.forEach((segment, idx) => {
    if (currentGroup && currentGroup.speaker === segment.speaker_label) {
      currentGroup.segments.push(segment);
    } else {
      if (currentGroup) {
        groupedSegments.push(currentGroup);
      }
      currentGroup = { speaker: segment.speaker_label, segments: [segment], startIndex: idx };
    }
  });
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

  const handleMergeSpeakers = async () => {
    if (!mergeSource || !mergeTarget || !onMergeSpeakers) return;

    setIsMerging(true);
    try {
      await onMergeSpeakers(mergeSource, mergeTarget);
      setMergeDialogOpen(false);
      setMergeSource("");
      setMergeTarget("");
    } finally {
      setIsMerging(false);
    }
  };

  // Segment editing handlers
  const handleStartEditSegment = (index: number, text: string) => {
    setEditingSegmentIndex(index);
    setEditingSegmentText(text);
  };

  const handleSaveSegment = () => {
    if (editingSegmentIndex === null || !onSegmentsChange) return;

    const updatedSegments = segments.map((seg, idx) =>
      idx === editingSegmentIndex
        ? { ...seg, text: editingSegmentText.trim() }
        : seg
    );
    onSegmentsChange(updatedSegments);
    setEditingSegmentIndex(null);
    setEditingSegmentText("");
  };

  const handleCancelEditSegment = () => {
    setEditingSegmentIndex(null);
    setEditingSegmentText("");
  };

  // Auto-resize textarea and focus
  useEffect(() => {
    if (editingSegmentIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editingSegmentIndex, editingSegmentText]);

  if (segments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No transcript segments available.</p>
    );
  }

  // Check if any segments have speaker labels
  const hasSpeakers = segments.some((s) => s.speaker_label);

  // Simple view without speakers (edit mode shows individual segments)
  if (!hasSpeakers) {
    return (
      <div className="space-y-2">
        {segments.map((segment, idx) => (
          <div
            key={idx}
            className={`flex gap-2 text-sm p-2 rounded ${
              isEditing ? "" : "cursor-pointer hover:bg-muted/50"
            }`}
            onClick={() => !isEditing && onSeekToTime?.(segment.start_time)}
          >
            <span className="text-muted-foreground font-mono text-xs w-12 flex-shrink-0">
              {formatTimestamp(segment.start_time)}
            </span>
            {isEditing && editingSegmentIndex === idx ? (
              <div className="flex-1 flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={editingSegmentText}
                  onChange={(e) => setEditingSegmentText(e.target.value)}
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveSegment();
                    }
                    if (e.key === "Escape") {
                      handleCancelEditSegment();
                    }
                  }}
                />
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={handleSaveSegment}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEditSegment}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ) : (
              <span
                className={isEditing ? "flex-1 cursor-pointer hover:bg-muted/50 rounded px-1" : ""}
                onClick={() => isEditing && handleStartEditSegment(idx, segment.text)}
              >
                {segment.text}
                {isEditing && (
                  <Edit2 className="inline-block h-3 w-3 ml-2 opacity-30" />
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Speaker Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground mr-2">Speakers:</span>
        {uniqueSpeakers.map((speaker) => (
          <button
            key={speaker}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm border ${speakerColors[speaker]} ${!readOnly && !isEditing ? "hover:opacity-80 cursor-pointer" : ""}`}
            onClick={() => !readOnly && !isEditing && handleEditSpeaker(speaker)}
            disabled={readOnly || isEditing}
          >
            <User className="h-3 w-3" />
            <span>{getSpeakerName(speaker)}</span>
            {!readOnly && !isEditing && <Edit2 className="h-3 w-3 ml-1 opacity-50" />}
          </button>
        ))}

        {/* Merge Speakers Button */}
        {!readOnly && !isEditing && uniqueSpeakers.length >= 2 && onMergeSpeakers && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setMergeDialogOpen(true)}
          >
            <Merge className="h-4 w-4 mr-1" />
            Merge Speakers
          </Button>
        )}
      </div>

      {/* Transcript - Edit Mode (individual segments) */}
      {isEditing ? (
        <div className="space-y-2">
          {segments.map((segment, idx) => {
            const colorClass = segment.speaker_label
              ? speakerColors[segment.speaker_label]
              : "bg-gray-100 border-gray-300 dark:bg-gray-800/30 dark:border-gray-600";

            return (
              <div
                key={idx}
                className={`p-2 rounded border-l-4 ${colorClass}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-xs">
                    {getSpeakerName(segment.speaker_label)}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatTimestamp(segment.start_time)}
                  </span>
                </div>

                {editingSegmentIndex === idx ? (
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={editingSegmentText}
                      onChange={(e) => setEditingSegmentText(e.target.value)}
                      className="flex-1 min-h-[60px] resize-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveSegment();
                        }
                        if (e.key === "Escape") {
                          handleCancelEditSegment();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={handleSaveSegment}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEditSegment}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5"
                    onClick={() => handleStartEditSegment(idx, segment.text)}
                  >
                    {segment.text}
                    <Edit2 className="inline-block h-3 w-3 ml-2 opacity-30" />
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode - Grouped segments */
        <div className="space-y-4">
          {groupedSegments.map((group, groupIdx) => {
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
      )}

      {/* Edit Speaker Name Dialog */}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveSpeakerName();
                }
              }}
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

      {/* Merge Speakers Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Speakers</DialogTitle>
            <DialogDescription>
              Combine two speakers into one. All segments from the source speaker will be reassigned to the target speaker.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Merge this speaker:</label>
              <Select value={mergeSource} onValueChange={setMergeSource}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select source speaker" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSpeakers
                    .filter(s => s !== mergeTarget)
                    .map((speaker) => (
                      <SelectItem key={speaker} value={speaker}>
                        {getSpeakerName(speaker)} ({speaker})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Into this speaker:</label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target speaker" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSpeakers
                    .filter(s => s !== mergeSource)
                    .map((speaker) => (
                      <SelectItem key={speaker} value={speaker}>
                        {getSpeakerName(speaker)} ({speaker})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {mergeSource && mergeTarget && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>Preview:</strong> All segments from{" "}
                <span className="font-medium">{getSpeakerName(mergeSource)}</span> will be merged into{" "}
                <span className="font-medium">{getSpeakerName(mergeTarget)}</span>.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMergeSpeakers}
              disabled={!mergeSource || !mergeTarget || isMerging}
            >
              {isMerging ? "Merging..." : "Merge Speakers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
