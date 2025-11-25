import { useEffect, useState } from "react";
import { MoreHorizontal, X, ChevronsUpDown, Check } from "lucide-react";
import { type Row } from "@tanstack/react-table";
import log from "@/services/logging";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "../ui/badge";
import type {
  ProjectMember,
  ProjectResponse,
  ProjectUpdate,
} from "@/types/project";
import type { UserResponse } from "@/types/user";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

interface CellActionsProps {
  row: Row<ProjectResponse>;
  onUpdate: (projectId: string, data: ProjectUpdate) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export function CellActions({ row, onUpdate, onDelete }: CellActionsProps) {
  const project = row.original;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [members, setMembers] = useState<ProjectMember[]>(project.members);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `${BACKEND_API_BASE_URL}/users?search=${searchQuery}`
        );
        const data: UserResponse[] = await response.json();

        const currentMemberIds = new Set(members.map((m) => m._id));
        setSearchResults(
          data.filter((user) => !currentMemberIds.has(user._id))
        );
      } catch (error) {
        log.error("Failed to search for users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, members]);

  const handleOpenEditDialog = () => {
    setName(project.name);
    setDescription(project.description || "");
    setMembers(project.members);

    setSearchQuery("");
    setSearchResults([]);

    setIsEditDialogOpen(true);
  };

  const handleRemoveMember = (memberId: string) => {
    if (memberId === project.owner._id) {
      log.warn("Attempted to remove the project owner. Action prevented.");
      return;
    }
    setMembers((currentMembers) =>
      currentMembers.filter((m) => m._id !== memberId)
    );
  };

  const handleSelectMember = (user: UserResponse) => {
    setMembers((currentMembers) => [
      ...currentMembers,
      { _id: user._id, username: user.username },
    ]);

    setSearchQuery("");
    setIsPopoverOpen(false);
  };

  const handleUpdate = async () => {
    const memberIds = members.map((member) => member._id);
    await onUpdate(project._id, {
      name,
      description,
      members_ids: memberIds,
    });
    setIsEditDialogOpen(false);
  };

  const handleDelete = async () => {
    await onDelete(project._id);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-[8px] border bg-background"
        >
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onSelect={handleOpenEditDialog}>
            View/Edit Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* --- Dialog Edit Project --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to the project here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Project Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            {/* Project Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3 min-h-[100px]"
                placeholder="Enter project description..."
              />
            </div>

            {/* Members Management */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Members</Label>
              <div className="col-span-3 flex flex-col gap-3">
                {/* list member */}
                <div className="flex flex-wrap gap-2 p-2 border min-h-[40px] rounded-[16px] !bg-background">
                  {members.map((member) => {
                    const isOwner = member._id === project.owner._id;
                    return (
                      <Badge
                        key={member._id}
                        variant={isOwner ? "default" : "secondary"}
                        className="flex items-center gap-1.5"
                      >
                        {member.username}

                        {isOwner && (
                          <span className="text-xs opacity-80">(Owner)</span>
                        )}

                        {!isOwner && (
                          <button
                            onClick={() => handleRemoveMember(member._id)}
                            className="rounded-full hover:bg-background/50"
                            aria-label={`Remove ${member.username}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    );
                  })}
                  {members.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">
                      No members assigned.
                    </span>
                  )}
                </div>

                {/* Combobox search, add member */}
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isPopoverOpen}
                      className="w-full justify-between"
                    >
                      Add a new member...
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 rounded-[8px]">
                    <Command>
                      <CommandInput
                        placeholder="Search username..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {isSearching && (
                          <div className="p-2 text-sm text-center">
                            Searching...
                          </div>
                        )}
                        <CommandEmpty>
                          {searchQuery && !isSearching
                            ? "No user found."
                            : null}
                        </CommandEmpty>
                        <CommandGroup>
                          {searchResults.map((user) => (
                            <CommandItem
                              key={user._id}
                              value={user.username}
                              onSelect={(currentValue) => {
                                const selectedUser = searchResults.find(
                                  (u) =>
                                    u.username.toLowerCase() ===
                                    currentValue.toLowerCase()
                                );
                                if (selectedUser) {
                                  handleSelectMember(selectedUser);
                                }
                              }}
                            >
                              <Check className="mr-2 h-4 w-4 opacity-0" />
                              {user.username}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
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

      {/* --- Dialog Delete Project --- */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete the project "{project.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
