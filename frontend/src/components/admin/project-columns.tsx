import { type ColumnDef } from "@tanstack/react-table";
import type { ProjectResponse, ProjectUpdate } from "@/types/project";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CellActions } from "./project-cell-actions";

export type ProjectColumnsProps = {
  onUpdate: (projectId: string, data: ProjectUpdate) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
};

export const getProjectColumns = ({
  onUpdate,
  onDelete,
}: ProjectColumnsProps): ColumnDef<ProjectResponse>[] => [
  // Name
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col pl-4">
          <span className="font-medium">{row.original.name}</span>
        </div>
      );
    },
  },
  // Description
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      return <div>{row.original.description}</div>;
    },
  },
  {
    accessorKey: "owner",
    header: "Owner ID",
    cell: ({ row }) => {
      return <div>{row.original.owner.username}</div>;
    },
  },
  {
    accessorKey: "members",
    header: "Members",
    cell: ({ row }) => {
      const memberCount = row.original.members.length;
      return <div>{memberCount}</div>;
    },
  },
  // Created At
  {
    accessorKey: "created_at",
    header: "Created Date",
    cell: ({ row }) => {
      return new Date(row.original.created_at!).toLocaleDateString("en-US");
    },
  },

  // Updated At
  {
    accessorKey: "updated_at",
    header: "Updated Date",
    cell: ({ row }) => {
      return new Date(row.original.updated_at!).toLocaleDateString("en-US");
    },
  },
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
