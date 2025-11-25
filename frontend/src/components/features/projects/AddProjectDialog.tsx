import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import type { UserResponse } from "@/types/user";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import type { Project } from "@/types/project";
import log from "@/services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const addProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters long."),
  description: z.string().optional(),
  members_ids: z.array(z.string()).optional(),
});

type AddProjectValues = z.infer<typeof addProjectSchema>;

interface AddProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (newProject: Project) => void;
}

export function AddProjectDialog({
  isOpen,
  onOpenChange,
  onProjectCreated,
}: AddProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const { user, token } = useAuth();

  const form = useForm<AddProjectValues>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: { name: "", description: "", members_ids: [] },
  });

  useEffect(() => {
    if (!isOpen || !token) {
      log.debug("AddProjectDialog: Not open or token missing, skipping user fetch.");
      return;
    }

    const fetchUsers = async () => {
      log.debug("AddProjectDialog: Fetching users for member selection.");
      try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          log.error("AddProjectDialog: Failed to fetch users. Status:", response.status);
          throw new Error("Failed to fetch users.");
        }
        const usersData = await response.json();
        setAllUsers(usersData.filter((u: UserResponse) => u._id !== user?._id));
        log.info(`AddProjectDialog: Fetched ${usersData.length} users.`);
      } catch (error) {
        log.error("AddProjectDialog: Could not load user list:", error);
        toast.error("Could not load user list.");
      }
    };
    fetchUsers();
  }, [isOpen, token, user?._id]);

  const handleClose = () => {
    log.debug("AddProjectDialog: Closing dialog and resetting form.");
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: AddProjectValues) => {
    log.info("AddProjectDialog: Attempting to create new project:", data.name);
    if (!user || !token) {
      log.warn("AddProjectDialog: User not logged in, cannot create project.");
      toast.error("You must be logged in.");
      return;
    }
    setIsSubmitting(true);

    const memberIds = data.members_ids || [];
    if (!memberIds.includes(user._id)) {
      memberIds.unshift(user._id);
      log.debug("AddProjectDialog: Added current user to project members.");
    }

    const requestBody = {
      name: data.name,
      description: data.description,
      owner_id: user._id,
      members_ids: memberIds,
      meeting_datetime: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        log.error("AddProjectDialog: Failed to create project. Status:", response.status, "Error:", errorData.detail || response.statusText);
        throw new Error(errorData.detail || "Failed to create project.");
      }

      const newProject: Project = await response.json();
      log.info("AddProjectDialog: Project created successfully! ID:", newProject._id, "Name:", newProject.name);
      toast.success("Project created successfully!");
      onProjectCreated(newProject);
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      log.error("AddProjectDialog: Error creating project:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      log.debug("AddProjectDialog: Project submission finished.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Project</DialogTitle>
          <DialogDescription>
            Projects help you group related meetings and members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Q4 Marketing Campaign"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of the project's goals."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="members_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Members (Optional)</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={allUsers.map((u) => ({
                        value: u._id,
                        label: u.full_name || u.username,
                      }))}
                      selected={field.value || []}
                      onSelectedChange={field.onChange}
                      placeholder="Select members..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
