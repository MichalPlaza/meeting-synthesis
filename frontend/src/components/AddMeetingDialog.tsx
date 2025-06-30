import { useState } from "react";
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
import { Label } from "./ui/label";
import { FileUpload } from "./FileUpload";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import type { Project } from "@/types/project";
import type { Meeting } from "@/types/meeting";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { Plus } from "lucide-react";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const addMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  projectId: z.string({ required_error: "You must select a project." }),
  tags: z.string().optional(),
  file: z.instanceof(File, { message: "An audio file is required." }),
});

type AddMeetingValues = z.infer<typeof addMeetingSchema>;

interface AddMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onMeetingAdded: () => void;
  onAddNewProject: () => void;
}

export function AddMeetingDialog({
  isOpen,
  onOpenChange,
  projects,
  onMeetingAdded,
  onAddNewProject,
}: AddMeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, token } = useAuth();

  const form = useForm<AddMeetingValues>({
    resolver: zodResolver(addMeetingSchema),
    defaultValues: {
      title: "",
      projectId: "",
      tags: "",
      file: undefined,
    },
  });

  const { control, handleSubmit, reset } = form;

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: AddMeetingValues) => {
    if (!user || !token) {
      toast.error("You must be logged in to add a meeting.");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("project_id", data.projectId);
    formData.append("uploader_id", user._id);
    formData.append("meeting_datetime", new Date().toISOString());
    formData.append("tags", data.tags || "");
    formData.append("file", data.file);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/meetings/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload meeting.");
      }

      const responseData: Meeting & {
        estimated_processing_time_seconds?: number;
      } = await response.json();
      const estimationMessage = responseData.estimated_processing_time_seconds
        ? `Estimated processing time: ${formatEstimation(
            responseData.estimated_processing_time_seconds
          )}.`
        : "Processing will start shortly.";

      toast.success("Meeting added successfully!", {
        description: estimationMessage,
      });

      onMeetingAdded();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Meeting</DialogTitle>
          <DialogDescription>
            Upload a recording to have it transcribed and analyzed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="title">Meeting Title</Label>
                  <FormControl>
                    <Input
                      id="title"
                      placeholder="e.g., Q3 Marketing Sync"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Label>Project</Label>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Combobox
                        options={projects.map((p) => ({
                          value: p._id,
                          label: p.name,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select a project..."
                        searchPlaceholder="Search projects..."
                        emptyMessage="No projects found."
                        triggerClassName="flex-grow"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={onAddNewProject}
                      aria-label="Add new project"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <FormControl>
                    <Input
                      id="tags"
                      placeholder="e.g., client-facing, critical, q3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <Label>Audio File</Label>
                  <FormControl>
                    <FileUpload onFileSelect={(file) => field.onChange(file)} />
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
                {isSubmitting ? "Uploading..." : "Add Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatEstimation(seconds: number): string {
  if (seconds < 60) {
    return `~${Math.ceil(seconds)} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes} minute${minutes > 1 ? "s" : ""}`;
}
