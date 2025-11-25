import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        "tag-blue":
          "border-transparent bg-tag-blue text-tag-blue-foreground",
        "tag-green":
          "border-transparent bg-tag-green text-tag-green-foreground",
        "tag-purple":
          "border-transparent bg-tag-purple text-tag-purple-foreground",
        "tag-orange":
          "border-transparent bg-tag-orange text-tag-orange-foreground",
        "tag-pink":
          "border-transparent bg-tag-pink text-tag-pink-foreground",
        "tag-yellow":
          "border-transparent bg-tag-yellow text-tag-yellow-foreground",
        "tag-cyan":
          "border-transparent bg-tag-cyan text-tag-cyan-foreground",
        "tag-red":
          "border-transparent bg-tag-red text-tag-red-foreground",
        "content-transcription":
          "border-transparent bg-content-transcription text-content-transcription-foreground",
        "content-summary":
          "border-transparent bg-content-summary text-content-summary-foreground",
        "content-key-topic":
          "border-transparent bg-content-key-topic text-content-key-topic-foreground",
        "content-action-item":
          "border-transparent bg-content-action-item text-content-action-item-foreground",
        "content-decision":
          "border-transparent bg-content-decision text-content-decision-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
