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
import { api } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";

const editProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters long."),
  description: z.string().optional(),
  members_ids: z.array(z.string()).optional(),
});

type EditProjectValues = z.infer<typeof editProjectSchema>;

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onProjectUpdated: (updatedProject: Project) => void;
}

export function EditProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, token } = useAuth();

  const { data: allUsers, isLoading: isLoadingUsers } = useApi<UserResponse[]>(
    "/users",
    {
      enabled: isOpen,
      token: token || undefined,
      onError: () => {
        toast.error("Failed to load users list.");
      },
    }
  );

  const form = useForm<EditProjectValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      members_ids: project.members_ids || [],
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        members_ids: project.members_ids || [],
      });
    }
  }, [form, project]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: EditProjectValues) => {
    if (!token || !user) return;

    setIsSubmitting(true);
    const memberIds = data.members_ids || [];
    if (!memberIds.includes(user._id)) memberIds.unshift(user._id);

    try {
      const updatedProject = await api.put<Project>(`/project/${project._id}`, {
        name: data.name,
        description: data.description,
        members_ids: memberIds,
      }, token);

      toast.success("Project updated successfully!");
      onProjectUpdated(updatedProject);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update project details here.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
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
                  <FormLabel>Members</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={(allUsers || []).map((u) => ({ value: u._id, label: u.full_name || u.username }))}
                      selected={field.value || []}
                      onSelectedChange={field.onChange}
                      placeholder={isLoadingUsers ? "Loading users..." : "Select members..."}
                      disabled={isSubmitting || isLoadingUsers}
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
