import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form"; // Dodano Controller
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
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
import { MultiSelect } from "@/components/ui/multi-select"; // <-- IMPORTUJEMY MultiSelect

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
  onProjectAdded: () => void;
}

export function AddProjectDialog({
  isOpen,
  onOpenChange,
  onProjectAdded,
}: AddProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const form = useForm<AddProjectValues>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: { name: "", description: "", members_ids: [] },
  });

  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch users.");
        const usersData = await response.json();
        // Filtrujemy bieżącego użytkownika z listy do wyboru
        setAllUsers(usersData.filter((u: UserResponse) => u._id !== user?._id));
      } catch (error) {
        toast.error("Could not load user list.");
      }
    };
    fetchUsers();
  }, [isOpen, token, user?._id]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: AddProjectValues) => {
    if (!user || !token) {
      toast.error("You must be logged in.");
      return;
    }
    setIsSubmitting(true);

    const memberIds = data.members_ids || [];
    // Upewniamy się, że właściciel projektu jest zawsze w members_ids
    if (!memberIds.includes(user._id)) {
      memberIds.unshift(user._id);
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
        throw new Error(errorData.detail || "Failed to create project.");
      }

      toast.success("Project created successfully!");
      onProjectAdded();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "An unknown error occurred.");
    } finally {
      setIsSubmitting(false);
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
              control={form.control} // Zmieniono na 'control' zamiast 'form.control'
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
                      options={allUsers.map((user) => ({
                        value: user._id,
                        label: user.full_name || user.username,
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
