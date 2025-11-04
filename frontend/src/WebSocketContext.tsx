import React, { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import log from "./services/logging";

const NOTIFICATION_SERVICE_URL = "ws://localhost:8001";

interface WebSocketContextType {
  // Na razie kontekst nie musi niczego eksponować na zewnątrz,
  // cała magia dzieje się w środku.
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    log.error("useWebSocket must be used within a WebSocketProvider");
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      log.info(
        "Attempting to establish WebSocket connection for user:",
        user._id
      );
      const wsUrl = `${NOTIFICATION_SERVICE_URL}/ws/${user._id}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        log.info("WebSocket connected to:", wsUrl);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          log.debug("WebSocket message received:", message);

          if (message.event_type === "meeting.processed") {
            const isSuccess = message.status === "completed";
            const toastMessage = `Meeting "${message.title}" has ${
              isSuccess ? "finished processing" : "failed"
            }!`;

            toast[isSuccess ? "success" : "error"](toastMessage, {
              description: "Click to view the details.",
              duration: 10000,
              action: {
                label: "View",
                onClick: () => {
                  log.debug(
                    "Navigating to meeting details for ID:",
                    message.meeting_id
                  );
                  navigate(`/meetings/${message.meeting_id}`);
                },
              },
            });
            log.info(
              "Meeting processed notification displayed for meeting ID:",
              message.meeting_id,
              "Status:",
              message.status
            );

            // Emit custom event to refresh meeting list
            const refreshEvent = new CustomEvent("meeting-processed", {
              detail: { meetingId: message.meeting_id, status: message.status },
            });
            window.dispatchEvent(refreshEvent);
            log.debug(
              "Dispatched meeting-processed event for meeting ID:",
              message.meeting_id
            );
          }
        } catch (error) {
          log.error(
            "Error parsing WebSocket message:",
            error,
            "Raw data:",
            event.data
          );
        }
      };

      socket.onclose = () => {
        log.info("WebSocket disconnected.");
      };

      socket.onerror = (error) => {
        log.error("WebSocket error:", error);
      };

      // Sprzątanie po odmontowaniu komponentu
      return () => {
        if (socket.readyState === 1) {
          // 1 == OPEN
          log.info("Closing WebSocket connection.");
          socket.close();
        }
      };
    } else {
      // Jeśli użytkownik się wyloguje, upewniamy się, że połączenie jest zamknięte
      if (socketRef.current) {
        log.info("User logged out, closing WebSocket connection.");
        socketRef.current.close();
        socketRef.current = null;
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <WebSocketContext.Provider value={{}}>{children}</WebSocketContext.Provider>
  );
};
