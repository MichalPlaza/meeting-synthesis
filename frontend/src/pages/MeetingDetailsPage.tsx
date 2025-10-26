import { useState, useEffect, useCallback, useRef } from "react";
import {useParams, Link, useNavigate} from "react-router-dom";
import { useAuth } from "@/AuthContext";
import type { Meeting } from "@/types/meeting";

import { format } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PlayIcon,
  PauseIcon,
  Loader2,
  FileText,
  CheckSquare,
  Flag,
  Sparkles,
  ListTree,
  FolderOpen,
  FileAudio,
  Download,
  Volume2,
  Volume1,
  VolumeX,
  Rewind,
  FastForward,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import log from "../services/logging";
import {EditMeetingDialog} from "@/components/EditMettingDialog.tsx";
import {toast} from "sonner";



const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.5, 0.75];

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const updateMeetingField = async (
    meetingId: string,
    token: string | null,
    field: string,
    value: any
) => {
  try {

    const body: any = {};
    const parts = field.split(".");
    let current = body;

    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        current[parts[i]] = value;
      } else {
        current[parts[i]] = {};
        current = current[parts[i]];
      }
    }
    const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;
    const res = await fetch(`${BACKEND_API_BASE_URL}/meetings/${meetingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to update meeting.");

    const updatedMeeting: Meeting = await res.json();
    return updatedMeeting;
  } catch (err: any) {
    console.error("Error updating meeting field:", err);
    throw err;
  }
};

function useMeetingData(meetingId: string | undefined) {
  const {token} = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchMeeting = useCallback(async () => {
    log.debug("Fetching meeting data for ID:", meetingId);
    if (!token || !meetingId) {
      log.warn("Authentication token or Meeting ID is missing for fetchMeeting.");
      setError("Authentication token or Meeting ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/meetings/${meetingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        log.error(`Failed to fetch meeting ${meetingId}. Status: ${response.status}`);
        throw new Error(`Failed to fetch meeting (Status: ${response.status})`);
      }
      const data: Meeting = await response.json();
      setMeeting(data);
      log.info("Successfully fetched meeting data for ID:", meetingId);
    } catch (err: any) {
      log.error("Error fetching meeting data:", err.message);
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [meetingId, token]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  return { meeting, loading, error, refetch: fetchMeeting };
}

function MeetingDetailsPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  log.info("MeetingDetailsPage rendered for meeting ID:", meetingId);
  const { meeting, loading, error, refetch } = useMeetingData(meetingId);
  const navigate = useNavigate();
  const {token} = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameIdRef = useRef<number>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");


  const isProcessing =
    meeting?.processing_status.current_stage !== "completed" &&
    meeting?.processing_status.current_stage !== "failed";

  const processingFailed =
    meeting?.processing_status.current_stage === "failed";

  const audioSrc = meeting?.audio_file.storage_path_or_url
    ? `${BACKEND_API_BASE_URL}${meeting.audio_file.storage_path_or_url}`
    : "";

  const downloadUrl = meeting
    ? `${BACKEND_API_BASE_URL}/meetings/${meeting._id}/download`
    : "";

  useEffect(() => {
    if (meeting?.ai_analysis?.summary) {
      setEditedSummary(meeting.ai_analysis.summary);
    }
  }, [meeting]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      log.debug("Audio loaded metadata. Duration:", audio.duration);
    };
    const handlePlayPause = () => {
      setIsPlaying(!audio.paused);
      log.debug("Audio play/pause toggled. Is playing:", !audio.paused);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      log.debug("Audio playback ended.");
    };

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("play", handlePlayPause);
    audio.addEventListener("pause", handlePlayPause);
    audio.addEventListener("ended", handleEnded);

    audio.playbackRate = playbackRate;
    audio.volume = volume;
    audio.muted = isMuted;

    log.debug("Audio element event listeners and properties set.");

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("play", handlePlayPause);
      audio.removeEventListener("pause", handlePlayPause);
      audio.removeEventListener("ended", handleEnded);
      log.debug("Audio element event listeners cleaned up.");
    };
  }, [audioSrc, playbackRate, volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const animate = () => {
      if (!audio || audio.paused || isSeeking) return;
      setCurrentTime(audio.currentTime);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      log.debug("Starting audio animation frame loop.");
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        log.debug("Cancelling audio animation frame loop.");
      }
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isPlaying, isSeeking]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (audio) {
      isPlaying ? audio.pause() : audio.play();
      log.info("Audio play/pause triggered. Is playing:", !isPlaying);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
      log.debug("Audio seeked to:", value[0]);
    }
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      log.debug("Audio rewinded by 10 seconds. New time:", audio.currentTime);
    }
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(duration, audio.currentTime + 10);
      log.debug("Audio forwarded by 10 seconds. New time:", audio.currentTime);
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      log.debug("Audio restarted.");
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
    log.debug("Volume changed to:", newVolume, "Muted:", isMuted);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    log.debug("Mute toggled. Is muted:", !isMuted);
  };

  const handlePlaybackRateCycle = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
    log.debug("Playback rate cycled to:", PLAYBACK_RATES[nextIndex]);
  };

  const handleDeleteMeeting = async () => {
  if (!meeting?._id) return;
  if (!confirm("Are you sure you want to delete this meeting?")) return;

  try {
    const res = await fetch(`${BACKEND_API_BASE_URL}/meetings/${meeting._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      navigate("/meetings");
    } else {
      alert("Failed to delete meeting");
    }
  } catch (e) {
    alert("Error deleting meeting");
  }
};
const handleSaveSummary = async () => {
  if (!meeting?._id) return;

  const updatedMeeting = await updateMeetingField(
    meeting._id,
    token,
    "ai_analysis.summary",
    editedSummary
  );

  if (updatedMeeting) {
    refetch();
    setIsEditingSummary(false);
  }
};




  if (loading) {
    log.debug("MeetingDetailsPage: Loading meeting details...");
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading meeting details...</span>
      </div>
    );
  }

  if (error) {
    log.error("MeetingDetailsPage: Error loading meeting details:", error);
    return (
      <ErrorState message={error} onRetry={refetch}>
        <Button variant="outline" asChild>
          <Link to="/meetings">← Back to Meetings</Link>
        </Button>
      </ErrorState>
    );
  }

  if (!meeting) {
    log.warn("MeetingDetailsPage: Meeting not found for ID:", meetingId);
    return (
      <EmptyState
        icon={FolderOpen}
        title="Meeting Not Found"
        description="We couldn't find a meeting with the specified ID."
      />
    );
  }



  const processedDate = format(new Date(meeting.meeting_datetime), "PPP, p");

  return (
      <div className="max-w-4xl mx-auto space-y-12">
        <EditMeetingDialog
          isOpen={editOpen}
          onOpenChange={setEditOpen}
          meeting={meeting}
          onMeetingUpdated={() => refetch()}
        />
        {/* Back link */}
        <div className="flex justify-between items-center mb-8">
          <Link
              to="/meetings"
              className="subtle hover:text-foreground transition-colors"
          >
            ← Back to Meetings
          </Link>
        </div>

        {/* Meeting title + Delete button */}
        <div className="flex justify-between items-start sm:items-center space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
            <p className="subtle">Processed on {processedDate}</p>
          </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button variant="destructive" onClick={handleDeleteMeeting}>
                  Delete Meeting
                </Button>
              </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-lg">
            <FileAudio size={20}/> Recording
          </h4>
          <div className="p-4 bg-card rounded-[var(--radius-container)] border shadow-sm">
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={handleRewind}>
                  <Rewind className="h-5 w-5" fill="currentColor"/>
                </Button>
                <Button size="icon" variant="ghost" onClick={togglePlay}>
                  {isPlaying ? (
                      <PauseIcon className="h-5 w-5" fill="currentColor"/>
                  ) : (
                      <PlayIcon className="h-5 w-5" fill="currentColor"/>
                  )}
                </Button>
                <Button size="icon" variant="ghost" onClick={handleForward}>
                  <FastForward className="h-5 w-5" fill="currentColor"/>
                </Button>
              </div>
              <div className="flex-grow flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-14 text-right font-mono">
                {formatTime(currentTime)}
              </span>
                <Slider
                    value={[currentTime]}
                    max={duration || 1}
                    step={1}
                    onValueChange={handleSliderChange}
                    onSeeking={setIsSeeking}
                    disabled={!audioSrc}
                />
                <span
                    className="text-xs text-muted-foreground w-14 text-left cursor-pointer font-mono"
                    onClick={() => setShowRemainingTime((p) => !p)}
                >
                {showRemainingTime
                    ? `-${formatTime(duration - currentTime)}`
                    : formatTime(duration)}
              </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlaybackRateCycle}
                >
                  <span className="text-xs font-semibold">{playbackRate}x</span>
                </Button>
                <Button size="icon" variant="ghost" onClick={handleRestart}>
                  <RotateCcw className="h-5 w-5"/>
                </Button>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={toggleMute}>
                    {isMuted || volume === 0 ? (
                        <VolumeX className="h-5 w-5"/>
                    ) : volume < 0.5 ? (
                        <Volume1 className="h-5 w-5"/>
                    ) : (
                        <Volume2 className="h-5 w-5"/>
                    )}
                  </Button>
                  <Slider
                      value={isMuted ? [0] : [volume]}
                      max={1}
                      step={0.05}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                  />
                </div>
                <Button size="icon" variant="ghost" asChild disabled={!audioSrc}>
                  <a href={downloadUrl} download>
                    <Download className="h-5 w-5"/>
                  </a>
                </Button>
              </div>
            </div>
            <audio ref={audioRef} src={audioSrc} preload="metadata"/>
          </div>
        </div>

        {isProcessing ? (
            <div
                className="p-6 rounded-[var(--radius-container)] border-2 border-dashed flex flex-col items-center justify-center text-center gap-3">
              {processingFailed ? (
                  <>
                    <AlertTriangle className="h-8 w-8 text-destructive"/>
                    <div>
                      <h3 className="font-semibold text-destructive">
                        Processing Failed!
                      </h3>
                      <p className="text-sm text-destructive/80 mt-1">
                        {meeting.processing_status.error_message ||
                            "An unknown error occurred."}
                      </p>
                    </div>
                  </>
              ) : (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Processing in Progress
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        The analysis for this meeting is underway. You will be
                        notified when it's ready.
                      </p>
                    </div>
                  </>
              )}
            </div>
        ) : (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="topics">Topics</TabsTrigger>
                <TabsTrigger value="action-items">Action Items</TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>

              {/* SUMMARY */}
              <TabsContent value="summary">
  <div className="p-6 space-y-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className="text-xl font-semibold flex items-center gap-3">
        <Sparkles size={20}/> <h4>Summary</h4>
      </div>
      {!isEditingSummary ? (
        <Button size="sm" variant="outline" onClick={() => setIsEditingSummary(true)}>
          Edit
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveSummary}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setIsEditingSummary(false); setEditedSummary(meeting.ai_analysis?.summary || "") }}>
            Cancel
          </Button>
        </div>
      )}
    </div>

    {isEditingSummary ? (
      <textarea
        className="w-full p-2 border rounded"
        value={editedSummary}
        onChange={(e) => setEditedSummary(e.target.value)}
      />
    ) : meeting.ai_analysis?.summary ? (
      <p className="text-foreground/80 leading-relaxed">{meeting.ai_analysis.summary}</p>
    ) : (
      <EmptyState
        icon={Sparkles}
        title="Summary Not Available"
        description="AI analysis could not be performed for this meeting."
        className="py-8"
      />
    )}
  </div>
</TabsContent>


              {/* TOPICS */}
              <TabsContent value="topics">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold flex items-center gap-3">
                      <ListTree size={20}/> <h4>Key Topics</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log("Edit Topics clicked")}
                    >
                      Edit
                    </Button>
                  </div>
                  {meeting.ai_analysis?.key_topics && meeting.ai_analysis.key_topics.length > 0 ? (
                    <div className="space-y-4">
                      {meeting.ai_analysis.key_topics.map((item, index) => (
                        <div key={index}>
                          <h4 className="font-semibold">{item.topic}</h4>
                          <p className="text-foreground/80">{item.details}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={ListTree}
                      title="No Key Topics Found"
                      description="Key topics could not be extracted from this meeting."
                      className="py-8"
                    />
                  )}
                </div>
              </TabsContent>

              {/* ACTION ITEMS */}
              <TabsContent value="action-items">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold flex items-center gap-3">
                      <CheckSquare size={20}/> <h4>Action Items</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log("Edit Action Items clicked")}
                    >
                      Edit
                    </Button>
                  </div>
                  {meeting.ai_analysis?.action_items && meeting.ai_analysis.action_items.length > 0 ? (
                    <div className="space-y-4">
                      {meeting.ai_analysis.action_items.map((item, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Checkbox id={`action-item-${index}`} className="mt-1"/>
                          <div className="grid gap-1.5 leading-none">
                            <label htmlFor={`action-item-${index}`} className="text-sm font-medium">
                              {item.description}
                            </label>
                            {(item.assigned_to || item.due_date) && (
                              <p className="text-xs text-muted-foreground">
                                {item.assigned_to && `Assigned to: ${item.assigned_to}`}
                                {item.assigned_to && item.due_date && " | "}
                                {item.due_date && `Due: ${item.due_date}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={CheckSquare}
                      title="No Action Items Found"
                      description="No actionable tasks were identified in this meeting."
                      className="py-8"
                    />
                  )}
                </div>
              </TabsContent>

              {/* DECISIONS */}
              <TabsContent value="decisions">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold flex items-center gap-3">
                      <Flag size={20}/> <h4>Decisions</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log("Edit Decisions clicked")}
                    >
                      Edit
                    </Button>
                  </div>
                  {meeting.ai_analysis?.decisions_made && meeting.ai_analysis.decisions_made.length > 0 ? (
                    <ul className="space-y-2 list-disc pl-5">
                      {meeting.ai_analysis.decisions_made.map((item, index) => (
                        <li key={index} className="text-foreground/80">{item.description}</li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      icon={Flag}
                      title="No Key Decisions Recorded"
                      description="No formal decisions were identified in this meeting."
                      className="py-8"
                    />
                  )}
                </div>
              </TabsContent>

              {/* TRANSCRIPT */}
              <TabsContent value="transcript">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold flex items-center gap-3">
                      <FileText size={20}/> <h4>Full Transcript</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => console.log("Edit Transcript clicked")}
                    >
                      Edit
                    </Button>
                  </div>
                  {meeting.transcription?.full_text ? (
                    <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                      {meeting.transcription.full_text}
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="No Transcript Available"
                      description="Transcription is not yet complete or failed for this meeting."
                      className="py-8"
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>

        )}
      </div>
  );
}

export default MeetingDetailsPage;
