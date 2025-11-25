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
import { SimpleSelect } from "@/components/ui/simple-select";
import { useAuth } from "@/contexts/AuthContext";
import type { UserResponse } from "@/types/user";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import type { Project } from "@/types/project";
import log from "@/services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const addProjectAdminSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters long."),
  description: z.string().optional(),
  owner_id: z.string().min(1, "Project manager is required."),
  members_ids: z.array(z.string()).optional(),
});

type AddProjectAdminValues = z.infer<typeof addProjectAdminSchema>;

interface AddProjectDialogAdminProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (newProject: Project) => void;
}

export function AddProjectDialogAdmin({
  isOpen,
  onOpenChange,
  onProjectCreated,
}: AddProjectDialogAdminProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [projectManagers, setProjectManagers] = useState<UserResponse[]>([]);
  const { token } = useAuth();

  const form = useForm<AddProjectAdminValues>({
    resolver: zodResolver(addProjectAdminSchema),
    defaultValues: {
      name: "",
      description: "",
      owner_id: "",
      members_ids: [],
    },
  });

  const selectedOwnerId = form.watch("owner_id");

  useEffect(() => {
    if (!isOpen || !token) {
      log.debug(
        "AddProjectDialogAdmin: Not open or token missing, skipping fetch."
      );
      return;
    }

    const fetchData = async () => {
      log.debug("AddProjectDialogAdmin: Fetching users and managers.");
      try {
        // Fetch all users
        const usersResponse = await fetch(`${BACKEND_API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!usersResponse.ok) {
          log.error(
            "AddProjectDialogAdmin: Failed to fetch users. Status:",
            usersResponse.status
          );
          throw new Error("Failed to fetch users.");
        }
        const usersData = await usersResponse.json();
        setAllUsers(usersData);

        // Fetch project managers
        const managersResponse = await fetch(
          `${BACKEND_API_BASE_URL}/users/managers`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!managersResponse.ok) {
          log.error(
            "AddProjectDialogAdmin: Failed to fetch managers. Status:",
            managersResponse.status
          );
          throw new Error("Failed to fetch project managers.");
        }
        const managersData = await managersResponse.json();
        setProjectManagers(managersData);

        log.info(
          `AddProjectDialogAdmin: Fetched ${usersData.length} users and ${managersData.length} managers.`
        );
      } catch (error) {
        log.error("AddProjectDialogAdmin: Could not load data:", error);
        toast.error("Could not load users list.");
      }
    };
    fetchData();
  }, [isOpen, token]);

  const handleClose = () => {
    log.debug("AddProjectDialogAdmin: Closing dialog and resetting form.");
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: AddProjectAdminValues) => {
    log.info(
      "AddProjectDialogAdmin: Attempting to create new project:",
      data.name
    );
    if (!token) {
      log.warn("AddProjectDialogAdmin: Token missing, cannot create project.");
      toast.error("Authentication required.");
      return;
    }
    setIsSubmitting(true);

    const memberIds = data.members_ids || [];
    // Always include owner in members if not already there
    if (!memberIds.includes(data.owner_id)) {
      memberIds.unshift(data.owner_id);
      log.debug("AddProjectDialogAdmin: Added owner to project members.");
    }

    const requestBody = {
      name: data.name,
      description: data.description,
      owner_id: data.owner_id,
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
        log.error(
          "AddProjectDialogAdmin: Failed to create project. Status:",
          response.status,
          "Error:",
          errorData.detail || response.statusText
        );
        throw new Error(errorData.detail || "Failed to create project.");
      }

      const newProject: Project = await response.json();
      log.info(
        "AddProjectDialogAdmin: Project created successfully! ID:",
        newProject._id,
        "Name:",
        newProject.name
      );
      toast.success("Project created successfully!");
      onProjectCreated(newProject);
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      log.error(
        "AddProjectDialogAdmin: Error creating project:",
        errorMessage
      );
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      log.debug("AddProjectDialogAdmin: Project submission finished.");
    }
  };

  // Available members are all users except the selected owner (they'll be added automatically)
  const availableMembers = allUsers.filter((u) => u._id !== selectedOwnerId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a New Project (Admin)</DialogTitle>
          <DialogDescription>
            Create a project and assign a project manager and team members.
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
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Manager</FormLabel>
                  <FormControl>
                    <SimpleSelect
                      options={projectManagers.map((manager) => ({
                        value: manager._id,
                        label: `${manager.full_name || manager.username} (${
                          manager.email
                        })`,
                      }))}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Select project manager..."
                      disabled={isSubmitting}
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
                  <FormLabel>Team Members (Optional)</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={availableMembers.map((u) => ({
                        value: u._id,
                        label: `${u.full_name || u.username} (${u.email})`,
                      }))}
                      selected={field.value || []}
                      onSelectedChange={field.onChange}
                      placeholder="Select team members..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Project manager will be automatically added to the team.
                  </p>
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
