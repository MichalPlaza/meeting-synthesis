import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";
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
  Mic,
  AlertTriangle,
  FileAudio,
  RotateCcw,
  RotateCw,
  Gauge,
  Download,
} from "lucide-react";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

// Funkcja pomocnicza do formatowania czasu w sekundach na MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

function MeetingDetailsPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Stany odtwarzacza audio ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  // --- Koniec stanów odtwarzacza audio ---

  const fetchData = useCallback(async () => {
    if (!token || !meetingId) {
      setError("Authentication token or Meeting ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const meetingApiUrl = `${BACKEND_API_BASE_URL}/meetings/${meetingId}`;
    try {
      const response = await fetch(meetingApiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404)
          throw new Error(`Meeting with ID "${meetingId}" not found.`);
        throw new Error(
          `Failed to fetch meeting details (Status: ${response.status})`
        );
      }
      const meetingData: Meeting = await response.json();
      setMeeting(meetingData);
    } catch (err: any) {
      setError(err.message || "Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [meetingId, token, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Logika odtwarzacza audio ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const togglePlayPause = () => setIsPlaying(!audio.paused);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("play", togglePlayPause);
    audio.addEventListener("pause", togglePlayPause);
    audio.addEventListener("ended", handleEnded);

    audio.playbackRate = playbackRate;

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("play", togglePlayPause);
      audio.removeEventListener("pause", togglePlayPause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [meeting?.audio_file.storage_path_or_url, playbackRate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      setCurrentTime(audio.currentTime);
    }
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
      setCurrentTime(audio.currentTime);
    }
  };

  const handlePlaybackRateChange = (rate: string) => {
    const newRate = parseFloat(rate);
    setPlaybackRate(newRate);
  };
  // --- Koniec logiki odtwarzacza audio ---

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading meeting details...</span>
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState message={error} onRetry={fetchData}>
        <Button variant="outline" asChild>
          <Link to="/meetings">← Meetings</Link>
        </Button>
      </ErrorState>
    );
  }
  if (!meeting) {
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
      <div className="flex justify-between items-center mb-8">
        <Link
          to={`/meetings`}
          className="subtle hover:text-foreground transition-colors"
        >
          ← Meetings
        </Link>
      </div>

      <div className="space-y-4">
        <h1>{meeting.title}</h1>
        <p className="subtle">Processed on {processedDate}</p>
        {meeting.processing_status.error_message && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Processing Failed!</AlertTitle>
            <AlertDescription>
              {meeting.processing_status.error_message}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="p-4 space-y-3 bg-card rounded-[var(--radius-container)] border shadow-sm">
        <h4 className="font-semibold flex items-center gap-2">
          <FileAudio size={16} /> Recording
        </h4>
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            onClick={togglePlay}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-muted border border-muted-foreground/30 text-foreground hover:bg-muted/80"
            aria-label={isPlaying ? "Pause recording" : "Play recording"}
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </Button>

          <Button
            size="icon"
            onClick={handleRewind}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-muted border border-muted-foreground/30 text-foreground hover:bg-muted/80"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <div className="flex-grow space-y-1">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSliderChange}
              className="w-full"
              disabled={
                duration === 0 || !meeting.audio_file.storage_path_or_url
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <Button
            size="icon"
            onClick={handleForward}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-muted border border-muted-foreground/30 text-foreground hover:bg-muted/80"
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex-shrink-0 h-10 px-3 rounded-[var(--radius-pill)]"
                aria-label="Change playback speed"
              >
                <Gauge className="h-4 w-4 mr-2" />
                <span>{playbackRate}x</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32">
              <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={playbackRate.toString()}
                onValueChange={handlePlaybackRateChange}
              >
                <DropdownMenuRadioItem value="0.75">
                  0.75x
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="1">
                  1x (Normal)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="1.25">
                  1.25x
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="1.5">1.5x</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            asChild
            className="flex-shrink-0 h-10 w-10 rounded-full bg-muted border border-muted-foreground/30 text-foreground hover:bg-muted/80"
            disabled={!meeting.audio_file.storage_path_or_url}
            aria-label={`Download audio file: ${meeting.audio_file.original_filename}`}
          >
            <a
              href={meeting.audio_file.storage_path_or_url}
              download={
                meeting.audio_file.original_filename ||
                `meeting_audio_${meeting._id}.mp3`
              }
            >
              <Download className="h-5 w-5" />
            </a>
          </Button>
        </div>
        {/* --- ZMIANA ZACZYNA SIĘ TUTAJ: Usunięto wiersz z nazwą pliku --- */}
        {/* <p className="text-sm text-muted-foreground mt-2">
          File: {meeting.audio_file.original_filename}
        </p> */}
        {/* --- ZMIANA KOŃCZY SIĘ TUTAJ --- */}
        <audio
          ref={audioRef}
          src={meeting.audio_file.storage_path_or_url}
          preload="metadata"
        />
      </div>

      <Tabs defaultValue="ai-summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="ai-summary" className="gap-2">
            <Sparkles size={16} /> Summary
          </TabsTrigger>
          <TabsTrigger value="action-items" className="gap-2">
            <CheckSquare size={16} /> Action Items
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-2">
            <Flag size={16} /> Decisions
          </TabsTrigger>
          <TabsTrigger value="full-transcript" className="gap-2">
            <FileText size={16} /> Transcript
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-summary" className="mt-4 space-y-8">
          {meeting.ai_analysis?.summary ? (
            <div className="p-6 space-y-4">
              <div className="text-xl font-semibold flex items-center gap-3">
                <Sparkles size={20} /> <h4>Summary</h4>
              </div>
              <p className="text-foreground/80 leading-relaxed">
                {meeting.ai_analysis?.summary}
              </p>
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Summary Not Available"
              description="AI analysis has not yet been performed or failed for this meeting."
              className="py-8"
            />
          )}

          {meeting.ai_analysis?.key_topics &&
          meeting.ai_analysis.key_topics.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="text-xl font-semibold flex items-center gap-3">
                <ListTree size={20} /> <h4>Key Topics</h4>
              </div>
              <div className="space-y-4">
                {meeting.ai_analysis.key_topics.map((item, index) => (
                  <div key={index}>
                    <h4 className="font-semibold text-foreground">
                      {item.topic}
                    </h4>
                    <p className="text-foreground/80">{item.details}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={ListTree}
              title="No Key Topics Found"
              description="Key topics could not be extracted from this meeting."
              className="py-8"
            />
          )}
        </TabsContent>

        <TabsContent value="action-items" className="mt-4">
          {meeting.ai_analysis?.action_items &&
          meeting.ai_analysis.action_items.length > 0 ? (
            <div className="space-y-4 p-6">
              <div className="text-xl font-semibold flex items-center gap-3 mb-4">
                <CheckSquare size={20} /> <h4>Action Items</h4>
              </div>
              {meeting.ai_analysis.action_items.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Checkbox id={`action-item-${index}`} className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`action-item-${index}`}
                      className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
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
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          {meeting.ai_analysis?.decisions_made &&
          meeting.ai_analysis.decisions_made.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="text-xl font-semibold flex items-center gap-3 mb-4">
                <Flag size={20} /> <h4>Decisions</h4>
              </div>
              <ul className="space-y-2 list-disc pl-5">
                {meeting.ai_analysis.decisions_made.map((item, index) => (
                  <li key={index} className="text-foreground/80">
                    {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={Flag}
              title="No Key Decisions Recorded"
              description="No formal decisions were identified in this meeting."
              className="py-8"
            />
          )}
        </TabsContent>

        <TabsContent value="full-transcript" className="mt-4 space-y-8">
          {meeting.transcription?.full_text ? (
            <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed p-6">
              <div className="text-xl font-semibold flex items-center gap-3 mb-4">
                <FileText size={20} /> <h4>Full Transcript</h4>
              </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MeetingDetailsPage;
