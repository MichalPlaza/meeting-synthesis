import { cn } from "@/lib/utils";
import { type LucideIcon, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  retrying?: boolean;
  errorCode?: string;
  errorDetails?: string;
  className?: string;
  children?: React.ReactNode;
}

function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Oops! Something went wrong.",
  message,
  onRetry,
  retryLabel = "Try Again",
  retrying = false,
  errorCode,
  errorDetails,
  className,
  children,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 border-2 border-dashed border-destructive/50 rounded-[var(--radius-container)] bg-destructive/5",
        className
      )}
    >
      <div className="bg-destructive/20 rounded-full p-3 mb-4">
        <Icon className="h-8 w-8 text-destructive" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold text-destructive">{title}</h2>
      <p className="mt-2 text-destructive/80 max-w-sm">{message}</p>
      {errorCode && (
        <p className="mt-1 text-xs text-destructive/60 font-mono">
          Error Code: {errorCode}
        </p>
      )}
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={onRetry} variant="destructive" loading={retrying}>
            {retryLabel}
          </Button>
          {children}
        </div>
        {errorDetails && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-destructive/70 hover:text-destructive flex items-center gap-1 transition-colors"
            aria-expanded={showDetails}
          >
            {showDetails ? "Hide" : "Show"} technical details
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
        {showDetails && errorDetails && (
          <div className="mt-2 p-4 bg-destructive/10 rounded-[var(--radius-field)] text-left max-w-lg w-full">
            <p className="text-xs text-destructive/80 font-mono whitespace-pre-wrap break-all">
              {errorDetails}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
