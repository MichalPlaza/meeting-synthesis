import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { type Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserResponse, UserUpdate } from "@/types/user";

interface CellActionsProps {
  row: Row<UserResponse>;
  onUpdate: (userId: string, data: UserUpdate) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

export function CellActions({ row, onUpdate, onDelete }: CellActionsProps) {
  const user = row.original;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [username, setUsername] = useState(user.username);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"user" | "admin">(user.role);

  const handleUpdate = async () => {
    await onUpdate(user._id, { full_name: fullName, email, username, role });
    setIsEditDialogOpen(false);
  };

  const handleDelete = async () => {
    await onDelete(user._id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-[8px] border">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {/* Open Dialog Edit */}
          <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
            View/Edit User
          </DropdownMenuItem>
          <DropdownMenuItem>Reset Password</DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Open Dialog Delete */}
          <DropdownMenuItem
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* --- Dialog Edit User --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to user profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                onValueChange={(value: "user" | "admin") => setRole(value)}
                defaultValue={role}
              >
                <SelectTrigger className="col-span-3 rounded-[16px] border !bg-background">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="rounded-[8px] border">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleUpdate}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Dialog Delete User --- */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              user "{user.full_name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button type="button" variant="destructive" onClick={handleDelete}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
