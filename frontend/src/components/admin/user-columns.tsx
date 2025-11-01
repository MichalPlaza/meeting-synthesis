import { type ColumnDef } from "@tanstack/react-table";
import type { UserResponse, UserUpdate } from "@/types/user";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CellActions } from "./user-cell-actions";

export type UserColumnsProps = {
  onUpdate: (userId: string, data: UserUpdate) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
};

export const getUserColumns = ({
  onUpdate,
  onDelete,
}: UserColumnsProps): ColumnDef<UserResponse>[] => [
  {
    accessorKey: "username",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col pl-4">
          <span className="font-medium">{row.original.username}</span>
          <span className="text-muted-foreground text-sm">
            {row.original.email}
          </span>
        </div>
      );
    },
  },

  // Full name
  {
    accessorKey: "full_name",
    header: "Full name",
    cell: ({ row }) => {
      return <div>{row.original.full_name}</div>;
    },
  },

  // Role
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <Badge
          variant={role === "admin" ? "default" : "secondary"}
          className="capitalize w-16 justify-center"
        >
          {role}
        </Badge>
      );
    },
  },

  {
    accessorKey: "created_at",
    header: "Joined Date",
    cell: ({ row }) => {
      return new Date(row.original.created_at!).toLocaleDateString("en-US"); // Định dạng lại ngày
    },
  },

  {
    accessorKey: "updated_at",
    header: "Updated Date",
    cell: ({ row }) => {
      return new Date(row.original.updated_at!).toLocaleDateString("en-US"); // Định dạng lại ngày
    },
  },

  // Actions
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <CellActions row={row} onUpdate={onUpdate} onDelete={onDelete} />
        </div>
      );
    },
  },
];
