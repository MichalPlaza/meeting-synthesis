import { useState, useEffect, useCallback, useRef } from "react";
import {useParams, Link, useNavigate} from "react-router-dom";
import { useAuth } from "@/AuthContext";
import type { Meeting } from "@/types/meeting";
import type { MeetingHistory } from  "@/types/meeting-history"
import { format } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { MeetingCommentsSection} from "@/components/MeetingCommentsSection";
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
import {EditMeetingDialog} from "@/components/EditMeetingDialog.tsx";


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
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  const [editedTopics, setEditedTopics] = useState([]);
  const [isEditingActionItems, setIsEditingActionItems] = useState(false);
  const [editedActionItems, setEditedActionItems] = useState([]);
  const [isEditingDecisions, setIsEditingDecisions] = useState(false);
  const [editedDecisions, setEditedDecisions] = useState([]);
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState("");
  const [lastEdits, setLastEdits] = useState<Record<string, MeetingHistory>>({});

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
    if (meeting?.transcription?.full_text) {
      setEditedTranscription(meeting.transcription.full_text);
    }
  }, [meeting]);


  useEffect(() => {
    if (meeting?.ai_analysis?.decisions_made) {
      setEditedDecisions(meeting.ai_analysis.decisions_made);
    }
  }, [meeting]);
  useEffect(() => {
    if (meeting?.ai_analysis?.action_items) {
      setEditedActionItems(meeting.ai_analysis.action_items);
    }
  }, [meeting]);

  useEffect(() => {
    if (meeting?.ai_analysis?.key_topics) {
      setEditedTopics(meeting.ai_analysis.key_topics);
    }
  }, [meeting]);

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

  const fetchHistory = useCallback(async () => {
  if (!token || !meetingId) return;

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/meeting_history/${meetingId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        setLastEdits({});
        return;
      }
      log.warn(`Failed to fetch history. Status: ${response.status}`);
      return;
    }

    const data: MeetingHistory[] = await response.json();

    const historyMap: Record<string, MeetingHistory> = {};
    data.forEach((change) => {
      historyMap[change.field] = change;
    });

    setLastEdits(historyMap);

    setLastEdits(historyMap);
    log.info("Successfully fetched meeting history.");
  } catch (err: any) {
    log.error("Error fetching history:", err.message);
  }
}, [meetingId, token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
    await refetch();
    await fetchHistory();
    setIsEditingSummary(false);
  }
};

const handleAddTopic = () => {
  setEditedTopics(prev => [
    ...prev,
    { topic: "", details: "" }
  ]);
};


const handleRemoveTopic = (index) => {
  setEditedTopics(prev => prev.filter((_, i) => i !== index));
};

const handleSaveTopics = async () => {
  if (!meeting?._id) return;

  const updated = await updateMeetingField(
    meeting._id,
    token,
    "ai_analysis.key_topics",
    editedTopics
  );

  if (updated) {
    refetch();
    setIsEditingTopics(false);
  }
};

const handleAddActionItem = () => {
  setEditedActionItems(prev => [
    ...prev,
    { description: "", assigned_to: "", due_date: "", user_comment: "" }
  ]);
};

const handleRemoveActionItem = (index) => {
  setEditedActionItems(prev => prev.filter((_, i) => i !== index));
};

const handleSaveActionItems = async () => {
  if (!meeting?._id) return;

  const updated = await updateMeetingField(
    meeting._id,
    token,
    "ai_analysis.action_items",
    editedActionItems
  );

  if (updated) {
    refetch();
    setIsEditingActionItems(false);
  }
};

const handleSaveDecisions = async () => {
  if (!meeting?._id) return;

  const updated = await updateMeetingField(
    meeting._id,
    token,
    "ai_analysis.decisions_made",
    editedDecisions
  );

  if (updated) {
    refetch();
    setIsEditingDecisions(false);
  }
};

const handleSaveTranscription = async () => {
  if (!meeting?._id) return;

  const updated = await updateMeetingField(
    meeting._id,
    token,
    "transcription.full_text",
    editedTranscription
  );

  if (updated) {
    refetch();
    setIsEditingTranscription(false);
  }
};

const LastEditedLabel = ({ change }: { change?: { username: string; changed_at: string } }) => {
  if (!change) return null;

  const dateStr = new Date(change.changed_at).toLocaleString('en-EN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="text-xs text-muted-foreground font-normal ml-1 mt-1">
      Last edited by <span className="font-medium text-foreground">{change.username}</span> on {dateStr}
    </div>
  );
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
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="topics">Topics</TabsTrigger>
                <TabsTrigger value="action-items">Action Items</TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
              </TabsList>

              {/* SUMMARY */}
              <TabsContent value="summary">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  {/* HEADER SECTION */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl font-semibold flex items-center gap-3">
                        <Sparkles size={20} />
                        <h4>Summary</h4>
                      </div>

                      {/* Tutaj wyświetlamy info, jeśli istnieje wpis w lastEdits */}
                      <LastEditedLabel change={lastEdits["ai_analysis.summary"]} />
                    </div>

                    {/* Prawa strona: Przyciski */}
                    {!isEditingSummary ? (
                      <Button size="sm" variant="outline" onClick={() => setIsEditingSummary(true)}>
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleSaveSummary}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingSummary(false);
                            setEditedSummary(meeting.ai_analysis?.summary || "");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* CONTENT SECTION */}
                  {isEditingSummary ? (
                    <textarea
                      className="w-full p-2 border rounded h-72 resize-y bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                    />
                  ) : meeting.ai_analysis?.summary ? (
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {meeting.ai_analysis.summary}
                    </p>
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
                  {/* HEADER */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl font-semibold flex items-center gap-3">
                        <ListTree size={20}/> <h4>Key Topics</h4>
                      </div>
                      {/* INFO O EDYCJI */}
                      <LastEditedLabel change={lastEdits["ai_analysis.key_topics"]} />
                    </div>

                    {!isEditingTopics ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingTopics(true)}
                        >
                          Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleSaveTopics}>
                            Save
                          </Button>
                          <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingTopics(false);
                                setEditedTopics(meeting.ai_analysis?.key_topics || []);
                              }}
                          >
                            Cancel
                          </Button>
                        </div>
                    )}
                  </div>

                  {/* EDIT MODE */}
                  {isEditingTopics ? (
                      <div className="space-y-4">
                        {editedTopics.map((item, index) => (
                            <div key={index} className="space-y-2 border p-3 rounded">
                              <input
                                  type="text"
                                  className="w-full p-2 border rounded"
                                  placeholder="Topic..."
                                  value={item.topic}
                                  onChange={(e) => {
                                    const updated = [...editedTopics];
                                    updated[index].topic = e.target.value;
                                    setEditedTopics(updated);
                                  }}
                              />
                              <textarea
                                  className="w-full p-2 border rounded"
                                  placeholder="Details..."
                                  value={item.details}
                                  onChange={(e) => {
                                    const updated = [...editedTopics];
                                    updated[index].details = e.target.value;
                                    setEditedTopics(updated);
                                  }}
                              />

                              <button
                                  className="text-red-500 text-sm"
                                  onClick={() => handleRemoveTopic(index)}
                              >
                                Remove
                              </button>
                            </div>
                        ))}

                        <button
                            className="mt-2 border p-2 rounded w-full"
                            onClick={handleAddTopic}
                        >
                          Add Topic
                        </button>
                      </div>
                  ) : (
                      // READONLY VIEW
                      meeting.ai_analysis?.key_topics && meeting.ai_analysis.key_topics.length > 0 ? (
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
                      )
                  )}
                </div>
              </TabsContent>


              {/* ACTION ITEMS */}
              <TabsContent value="action-items">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl font-semibold flex items-center gap-3">
                        <CheckSquare size={20}/> <h4>Action Items</h4>
                      </div>
                      <LastEditedLabel change={lastEdits["ai_analysis.action_items"]} />
                    </div>

                    {!isEditingActionItems ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingActionItems(true)}
                        >
                          Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleSaveActionItems}>
                            Save
                          </Button>
                          <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingActionItems(false);
                                setEditedActionItems(meeting.ai_analysis?.action_items || []);
                              }}
                          >
                            Cancel
                          </Button>
                        </div>
                    )}
                  </div>

                  {/* EDIT MODE */}
                  {isEditingActionItems ? (
                      <div className="space-y-4">
                        {editedActionItems.map((item, index) => (
                            <div key={index} className="space-y-2 border p-3 rounded">
                              <input
                                  type="text"
                                  className="w-full p-2 border rounded"
                                  placeholder="Description..."
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...editedActionItems];
                                    updated[index].description = e.target.value;
                                    setEditedActionItems(updated);
                                  }}
                              />
                              <input
                                  type="text"
                                  className="w-full p-2 border rounded"
                                  placeholder="Assigned to..."
                                  value={item.assigned_to}
                                  onChange={(e) => {
                                    const updated = [...editedActionItems];
                                    updated[index].assigned_to = e.target.value;
                                    setEditedActionItems(updated);
                                  }}
                              />
                              <input
                                  type="date"
                                  className="w-full p-2 border rounded"
                                  value={item.due_date || ""}
                                  onChange={(e) => {
                                    const updated = [...editedActionItems];
                                    updated[index].due_date = e.target.value;
                                    setEditedActionItems(updated);
                                  }}
                              />
                              <textarea
                                  className="w-full p-2 border rounded"
                                  placeholder="User comment..."
                                  value={item.user_comment}
                                  onChange={(e) => {
                                    const updated = [...editedActionItems];
                                    updated[index].user_comment = e.target.value;
                                    setEditedActionItems(updated);
                                  }}
                              />
                              <button
                                  className="text-red-500 text-sm"
                                  onClick={() => {
                                    setEditedActionItems(prev => prev.filter((_, i) => i !== index));
                                  }}
                              >
                                Remove
                              </button>
                            </div>
                        ))}

                        <button
                            className="mt-2 border p-2 rounded w-full"
                            onClick={handleAddActionItem}
                        >
                          Add Action Item
                        </button>
                      </div>
                  ) : (
                      /* READONLY MODE */
                      meeting.ai_analysis?.action_items && meeting.ai_analysis.action_items.length > 0 ? (
                          <div className="space-y-4">
                            {meeting.ai_analysis.action_items.map((item, index) => (
                                <div key={index} className="flex flex-col gap-1 border p-3 rounded">
                                  <span className="font-semibold">{item.description}</span>
                                  <span className="text-sm text-muted-foreground">
                              {item.assigned_to && `Assigned: ${item.assigned_to}`}
                                    {item.due_date && ` | Due: ${item.due_date}`}
                            </span>
                                  {item.user_comment && (
                                      <span className="text-xs text-muted-foreground">
                                {item.user_comment}
                              </span>
                                  )}
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
                      )
                  )}
                </div>
              </TabsContent>

              {/* DECISIONS */}
              <TabsContent value="decisions">
                <div className="p-6 space-y-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="text-xl font-semibold flex items-center gap-3">
                        <Flag size={20}/> <h4>Decisions</h4>
                      </div>
                      <LastEditedLabel change={lastEdits["ai_analysis.decisions_made"]} />
                    </div>

                    {!isEditingDecisions ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingDecisions(true)}
                        >
                          Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleSaveDecisions}>
                            Save
                          </Button>
                          <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingDecisions(false);
                                setEditedDecisions(meeting.ai_analysis?.decisions_made || []);
                              }}
                          >
                            Cancel
                          </Button>
                        </div>
                    )}
                  </div>

                  {/* EDIT MODE */}
                  {isEditingDecisions ? (
                      <div className="space-y-4">
                        {editedDecisions.map((item, index) => (
                            <div key={index} className="space-y-2 border p-3 rounded">
                              <input
                                  type="text"
                                  className="w-full p-2 border rounded"
                                  placeholder="Decision description..."
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...editedDecisions];
                                    updated[index].description = e.target.value;
                                    setEditedDecisions(updated);
                                  }}
                              />
                              <button
                                  className="text-red-500 text-sm"
                                  onClick={() => setEditedDecisions(prev => prev.filter((_, i) => i !== index))}
                              >
                                Remove
                              </button>
                            </div>
                        ))}

                        <button
                            className="mt-2 border p-2 rounded w-full"
                            onClick={() => setEditedDecisions(prev => [...prev, {description: ""}])}
                        >
                          Add Decision
                        </button>
                      </div>
                  ) : (
                      /* READONLY MODE */
                      meeting.ai_analysis?.decisions_made && meeting.ai_analysis.decisions_made.length > 0 ? (
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
                      )
                  )}
                </div>
              </TabsContent>


              {/* TRANSCRIPT */}
             <TabsContent value="transcript">
              <div className="p-6 space-y-4 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="text-xl font-semibold flex items-center gap-3">
                      <FileText size={20}/> <h4>Full Transcript</h4>
                    </div>
                    <LastEditedLabel change={lastEdits["transcription.full_text"]} />
                  </div>

                  {!isEditingTranscription ? (
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingTranscription(true)}
                      >
                        Edit
                      </Button>
                  ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleSaveTranscription}>
                          Save
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingTranscription(false);
                              setEditedTranscription(meeting.transcription?.full_text || "");
                            }}
                        >
                          Cancel
                        </Button>
                      </div>
                  )}
                </div>

                {/* EDIT MODE */}
                {isEditingTranscription ? (
                    <textarea
                        className="w-full p-2 border rounded h-126 resize-y"
                        value={editedTranscription}
                        onChange={(e) => setEditedTranscription(e.target.value)}
                    />
                ) : (
                    /* READONLY MODE */
                    meeting.transcription?.full_text ? (
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
                    )
                )}
              </div>
            </TabsContent>
            </Tabs>
        )
        }
        <div className="my-10">
          <Separator/>
        </div>
        <MeetingCommentsSection meetingId={meetingId!}/>
      </div>
  );
}

export default MeetingDetailsPage;
