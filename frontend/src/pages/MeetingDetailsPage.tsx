import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";
import { format } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  PlayIcon,
  Loader2,
  FileText,
  CheckSquare,
  Flag,
  Sparkles,
  ListTree,
} from "lucide-react";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function MeetingDetailsPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
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
    };
    fetchMeetingData();
  }, [meetingId, token, logout, navigate]);

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
      <div className="text-center">
        <p className="text-destructive font-semibold">{error}</p>
        <Link to="/projects" className="mt-4 inline-block">
          <Button variant="outline">← Back to Projects</Button>
        </Link>
      </div>
    );
  }
  if (!meeting) {
    return (
      <p className="text-center text-muted-foreground">
        Meeting details could not be loaded.
      </p>
    );
  }

  const processedDate = format(new Date(meeting.meeting_datetime), "PPP, p");
  const cardClassName = "mt-4 bg-card rounded-xl shadow-md border p-6";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          to={`/projects/${meeting.project_id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Project
        </Link>
      </div>

      <div className="space-y-2 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {meeting.title}
        </h1>
        <p className="text-muted-foreground">Processed on {processedDate}</p>
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

        <TabsContent value="ai-summary">
          <Card className={cardClassName}>
            <CardHeader className="p-0">
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <ListTree size={20} /> Key Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-4 pl-9 space-y-4">
              {meeting.ai_analysis?.key_topics?.map((item, index) => (
                <div key={index}>
                  <p className="font-semibold text-foreground">{item.topic}</p>
                  <p className="text-foreground/80">{item.details}</p>
                </div>
              ))}
            </CardContent>

            <CardHeader className="p-0 mt-8">
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <Sparkles size={20} /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-4 pl-9">
              <p className="text-foreground/80 leading-relaxed">
                {meeting.ai_analysis?.summary || "No summary available."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="action-items">
          <Card className={cardClassName}>
            <CardContent className="p-0">
              <div className="space-y-4">
                {meeting.ai_analysis?.action_items &&
                meeting.ai_analysis.action_items.length > 0 ? (
                  meeting.ai_analysis.action_items.map((item, index) => (
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
                            {item.assigned_to &&
                              `Assigned to: ${item.assigned_to}`}
                            {item.assigned_to && item.due_date && " | "}
                            {item.due_date && `Due: ${item.due_date}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No action items found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card className={cardClassName}>
            <CardContent className="p-0">
              <ul className="space-y-2 list-disc pl-5">
                {meeting.ai_analysis?.decisions_made &&
                meeting.ai_analysis.decisions_made.length > 0 ? (
                  meeting.ai_analysis.decisions_made.map((item, index) => (
                    <li key={index} className="text-foreground/80">
                      {item.description}
                    </li>
                  ))
                ) : (
                  <p className="text-muted-foreground list-none pl-0">
                    No key decisions recorded.
                  </p>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full-transcript">
          <Card className={cardClassName}>
            <CardContent className="p-0 space-y-6">
              <div className="flex items-center space-x-4 p-3 bg-secondary rounded-lg">
                <Button size="icon" variant="default">
                  <PlayIcon className="h-5 w-5" />
                </Button>
                <div className="flex-grow">
                  <span className="font-medium">Meeting Recording</span>
                  <p className="text-xs text-muted-foreground">
                    {meeting.audio_file.original_filename}
                  </p>
                </div>
              </div>
              <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {meeting.transcription?.full_text || "No transcript available."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MeetingDetailsPage;
