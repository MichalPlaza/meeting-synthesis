import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import React from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 border-2 border-dashed border-border rounded-[var(--radius-container)]",
        className
      )}
    >
      <div className="bg-muted rounded-full p-4 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-muted-foreground max-w-sm">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export default EmptyState;
