import { useState, useEffect, useCallback } from "react";
import type { Meeting } from "@/types/meeting";
import { useAuth } from "@/AuthContext";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;
const POLLING_INTERVAL = 4000; // Co 4 sekundy

// Mapa progów procentowych dla każdego *rzeczywistego* etapu
const STAGE_PROGRESS_MAP = {
  uploaded: 5,
  queued: 10,
  transcribing: 15, // Skoczy na 15%, gdy rozpocznie się transkrypcja
  analyzing: 75, // Skoczy na 75%, gdy rozpocznie się analiza
  completed: 100,
  failed: 100,
  processing: 5, // Fallback
};

export function useMeetingPolling(meetingId: string | undefined) {
  const { token } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const isProcessing =
    meeting?.processing_status.current_stage !== "completed" &&
    meeting?.processing_status.current_stage !== "failed";

  const fetchMeeting = useCallback(
    async (isInitialFetch = false) => {
      if (!token || !meetingId) {
        setError("Authentication token or Meeting ID is missing.");
        if (isInitialFetch) setLoading(false);
        return;
      }

      if (isInitialFetch) setError(null);

      try {
        const response = await fetch(
          `${BACKEND_API_BASE_URL}/meetings/${meetingId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok)
          throw new Error(
            `Failed to fetch meeting (Status: ${response.status})`
          );

        const data: Meeting = await response.json();
        setMeeting(data);

        // Ustawiamy postęp na podstawie stanu pobranego z API
        const currentStage = data.processing_status.current_stage;
        const newProgress =
          STAGE_PROGRESS_MAP[currentStage as keyof typeof STAGE_PROGRESS_MAP] ||
          0;
        setProgress(newProgress);
      } catch (err: any) {
        setError(err.message || "Failed to connect to the server.");
      } finally {
        if (isInitialFetch) setLoading(false);
      }
    },
    [meetingId, token]
  );

  // Efekt odpowiedzialny tylko za odpytywanie API
  useEffect(() => {
    fetchMeeting(true); // Pierwsze pobranie

    if (isProcessing) {
      const pollingId = setInterval(() => {
        fetchMeeting(false);
      }, POLLING_INTERVAL);

      return () => clearInterval(pollingId);
    }
  }, [fetchMeeting, isProcessing]);

  return {
    meeting,
    loading,
    error,
    refetch: () => fetchMeeting(true),
    progress,
  };
}
