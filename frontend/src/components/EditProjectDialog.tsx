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
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/AuthContext";
import type { UserResponse } from "@/types/user";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import type { Project } from "@/types/project";
import log from "../services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const editProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters long."),
  description: z.string().optional(),
  members_ids: z.array(z.string()).optional(),
});

type EditProjectValues = z.infer<typeof editProjectSchema>;

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project; // cały obiekt projektu
  onProjectUpdated: (updatedProject: Project) => void;
}

export function EditProjectDialog({
  isOpen,
  onOpenChange,
  project,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const { user, token } = useAuth();

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
  }, [project]);

  const handleClose = () => {
    form.reset(); // opcjonalnie resetujemy
    onOpenChange(false);
  };

  const onSubmit = async (data: EditProjectValues) => {
    if (!token || !user) return;

    setIsSubmitting(true);
    const memberIds = data.members_ids || [];
    if (!memberIds.includes(user._id)) memberIds.unshift(user._id);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/project/${project._id}`, {
        method: "PUT", // PUT zamiast POST
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          members_ids: memberIds,
        }),
      });

      if (!response.ok) throw new Error("Failed to update project.");

      const updatedProject: Project = await response.json();
      toast.success("Project updated successfully!");
      onProjectUpdated(updatedProject);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Error updating project.");
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
                      options={allUsers.map((u) => ({ value: u._id, label: u.full_name || u.username }))}
                      selected={field.value || []}
                      onSelectedChange={field.onChange}
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
