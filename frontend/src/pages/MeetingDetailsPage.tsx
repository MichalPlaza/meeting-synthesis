import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";
import { format } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PlayIcon, Loader2 } from "lucide-react";

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
          if (response.status === 401) {
            logout();
            navigate("/login");
            throw new Error("Session expired. Please log in again.");
          }
          if (response.status === 404) {
            throw new Error(`Meeting with ID "${meetingId}" not found.`);
          }
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
  const cardClassName = "mt-4 bg-card rounded-xl shadow-md border";

  return (
    <div className="container mx-auto p-2 md:p-6">
      <div className="mb-6">
        <Link
          to={`/projects/${meeting.project_id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Project
        </Link>
      </div>

      <h2 className="text-3xl font-bold mb-2">Meeting: {meeting.title}</h2>
      <p className="text-muted-foreground mb-6">Processed on {processedDate}</p>

      <Tabs defaultValue="ai-summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="ai-summary">📝 Summary</TabsTrigger>
          <TabsTrigger value="action-items">✅ Action Items</TabsTrigger>
          <TabsTrigger value="decisions">📌 Decisions</TabsTrigger>
          <TabsTrigger value="full-transcript">📄 Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-summary">
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <span>✍️</span> Key Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pl-8">
              {meeting.ai_analysis?.key_topics?.map((item, index) => (
                <div key={index}>
                  <p className="font-semibold text-foreground">{item.topic}</p>
                  <p className="text-foreground/80">{item.details}</p>
                </div>
              ))}
            </CardContent>
            <CardHeader className="pt-6">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <span>🤖</span> AI Generated Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 leading-relaxed">
                {meeting.ai_analysis?.summary || "No AI summary available."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="action-items">
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                ✅ Action Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      <p className="text-xs text-muted-foreground">
                        {item.assigned_to && `Assigned to: ${item.assigned_to}`}
                        {item.assigned_to && item.due_date && " | "}
                        {item.due_date && `Due: ${item.due_date}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No action items found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                📌 Key Decisions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pl-8 list-disc">
              {meeting.ai_analysis?.decisions_made &&
              meeting.ai_analysis.decisions_made.length > 0 ? (
                meeting.ai_analysis.decisions_made.map((item, index) => (
                  <li key={index} className="text-foreground/80">
                    {item.description}
                  </li>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No key decisions recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full-transcript">
          <Card className={cardClassName}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                📄 Full Transcript
              </CardTitle>
              {true && (
                <div className="flex items-center space-x-4 mt-4 p-3 bg-secondary rounded-lg">
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
              )}
            </CardHeader>
            <CardContent>
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
