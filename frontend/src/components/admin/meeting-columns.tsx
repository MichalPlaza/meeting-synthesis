import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CellActions } from "./meeting-cell-actions";
import type { Meeting, PopulatedMeeting } from "@/types/meeting";

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return "N/A";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

export type MeetingColumnsProps = {
  onViewDetails: (meeting: PopulatedMeeting) => void;
  onDelete: (meetingId: string) => Promise<void>;
};

export const getMeetingColumns = ({
  onViewDetails,
  onDelete,
}: MeetingColumnsProps): ColumnDef<PopulatedMeeting>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="pl-4 font-medium">{row.original.title}</div>
    ),
  },

  {
    accessorKey: "processing_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.processing_status?.current_stage;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "secondary";

      switch (status) {
        case "completed":
          variant = "default";
          break;
        case "processing":
          variant = "outline";
          break;
        case "failed":
          variant = "destructive";
          break;
        case "pending":
        default:
          variant = "secondary";
          break;
      }

      return (
        <Badge variant={variant} className="capitalize w-24 justify-center">
          {status || "Unknown"}
        </Badge>
      );
    },
  },

  {
    accessorKey: "project_id",
    header: "Project",
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.original.project.name}</div>
    ),
  },

  {
    accessorKey: "uploader_id",
    header: "Uploaded By",
    cell: ({ row }) => (
      <div className="font-mono text-xs">{row.original.uploader.username}</div>
    ),
  },

  {
    accessorKey: "duration_seconds",
    header: "Duration",
    cell: ({ row }) => {
      return <div>{formatDuration(row.original.duration_seconds)}</div>;
    },
  },

  {
    accessorKey: "meeting_datetime",
    header: "Meeting Date",
    cell: ({ row }) => {
      return new Date(row.original.meeting_datetime).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    },
  },

  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tags?.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    ),
  },

  {
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <CellActions
          row={row}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
        />
      </div>
    ),
  },
];
