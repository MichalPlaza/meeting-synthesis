import React, { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
      const wsUrl = `${NOTIFICATION_SERVICE_URL}/ws/${user._id}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);

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
                onClick: () => navigate(`/meetings/${message.meeting_id}`),
              },
            });

            // W przyszłości możemy tu dodać event emitter, by odświeżyć dane na stronie
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      // Sprzątanie po odmontowaniu komponentu
      return () => {
        if (socket.readyState === 1) {
          // 1 == OPEN
          socket.close();
        }
      };
    } else {
      // Jeśli użytkownik się wyloguje, upewniamy się, że połączenie jest zamknięte
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <WebSocketContext.Provider value={{}}>{children}</WebSocketContext.Provider>
  );
};
