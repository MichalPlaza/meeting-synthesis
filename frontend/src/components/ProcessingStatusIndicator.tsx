import { cn } from "@/lib/utils";
import {
  Loader2,
  Hourglass,
  Sparkles,
  FileText,
  AlertTriangle,
} from "lucide-react";
import type { Meeting } from "@/types/meeting";
import log from "../services/logging";

interface ProcessingStatusIndicatorProps {
  status: Meeting["processing_status"];
  progress: number;
  className?: string;
}

const statusConfig = {
  uploaded: {
    icon: Hourglass,
    label: "Waiting to be processed...",
    animate: true,
  },
  queued: {
    icon: Hourglass,
    label: "In queue for processing...",
    animate: true,
  },
  transcribing: {
    icon: FileText,
    label: "Transcribing audio...",
    animate: true
  },
  analyzing: {
    icon: Sparkles,
    label: "Analyzing transcript...",
    animate: true
  },
  processing: { icon: Loader2, label: "Processing...", animate: true },
};

export function ProcessingStatusIndicator({
  status,
  progress,
  className,
}: ProcessingStatusIndicatorProps) {
  log.debug("ProcessingStatusIndicator rendered with status:", status.current_stage, "and progress:", progress);
  if (status.current_stage === "completed") {
    return null;
  }

  if (status.current_stage === "failed") {
    log.warn("Processing failed for meeting. Error:", status.error_message);
    return (
      <div
        className={cn(
          "p-6 rounded-[var(--radius-container)] border-2 border-dashed border-destructive/50 bg-destructive/10",
          className
        )}
      >
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">
              Processing Failed!
            </h3>
            <p className="text-sm text-destructive/80 mt-1">
              {status.error_message || "An unknown error occurred."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const config =
    statusConfig[status.current_stage as keyof typeof statusConfig] ||
    statusConfig.processing;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-6 rounded-[var(--radius-container)] border-2 border-dashed",
        className
      )}
    >
      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <Icon className={cn("h-6 w-6", config.animate && "animate-spin")} />
        <span className="text-lg font-medium">{config.label}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5 mt-4 overflow-hidden relative">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Status will update automatically.
      </p>
    </div>
  );
}
