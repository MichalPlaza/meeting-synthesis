import { cn } from "@/lib/utils";
import { type LucideIcon, AlertTriangle } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Oops! Something went wrong.",
  message,
  onRetry,
  retryLabel = "Try Again",
  className,
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
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
      <div className="mt-6 flex items-center gap-4">
        <Button onClick={onRetry} variant="destructive">
          {retryLabel}
        </Button>
        {children}
      </div>
    </div>
  );
}

export default ErrorState;
