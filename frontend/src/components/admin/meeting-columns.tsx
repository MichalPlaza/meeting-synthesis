import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CellActions } from "./meeting-cell-actions"; // Chúng ta sẽ tạo file này tiếp theo
import type { Meeting } from "@/types/meeting"; // Import type Meeting của bạn

// Hàm trợ giúp để định dạng giây thành MM:SS
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
  // Vì "Edit" một meeting rất phức tạp, chúng ta sẽ bắt đầu với "View Details"
  onViewDetails: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => Promise<void>;
};

export const getMeetingColumns = ({
  onViewDetails,
  onDelete,
}: MeetingColumnsProps): ColumnDef<Meeting>[] => [
  // Cột Title
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

  // Cột Trạng thái xử lý
  {
    accessorKey: "processing_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.processing_status?.current_stage;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "secondary";

      switch (status) {
        case "completed":
          variant = "default"; // Màu xanh (hoặc màu chính)
          break;
        case "processing":
          variant = "outline"; // Màu xanh dương
          break;
        case "failed":
          variant = "destructive"; // Màu đỏ
          break;
        case "pending":
        default:
          variant = "secondary"; // Màu xám
          break;
      }

      return (
        <Badge variant={variant} className="capitalize w-24 justify-center">
          {status || "Unknown"}
        </Badge>
      );
    },
  },

  // Cột Thời lượng
  {
    accessorKey: "duration_seconds",
    header: "Duration",
    cell: ({ row }) => {
      return <div>{formatDuration(row.original.duration_seconds)}</div>;
    },
  },

  // Cột Ngày họp
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

  // Cột Tên file gốc
  {
    accessorKey: "audio_file",
    header: "Original File",
    cell: ({ row }) => {
      return <div>{row.original.audio_file.original_filename}</div>;
    },
  },

  // Cột Tags
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

  // Cột Actions
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
