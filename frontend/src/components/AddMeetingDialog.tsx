import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/FileUpload";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";
import type { Project } from "@/types/project";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const addMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  projectId: z.string().min(1, "You must select a project."),
  tags: z.string().optional(),
  file: z.instanceof(File, { message: "An audio file is required." }),
});

type AddMeetingValues = z.infer<typeof addMeetingSchema>;

interface AddMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onMeetingAdded: () => void; // Callback to refresh the list
}

export function AddMeetingDialog({
  isOpen,
  onOpenChange,
  projects,
  onMeetingAdded,
}: AddMeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, token } = useAuth();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddMeetingValues>({
    resolver: zodResolver(addMeetingSchema),
  });

  const handleFileSelect = (file: File | null) => {
    setValue("file", file as File, { shouldValidate: true });
  };

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload meeting.");
      }

      toast.success("Meeting added successfully! It is now being processed.");
      onMeetingAdded(); // Trigger list refresh
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  id="title"
                  placeholder="e.g., Q3 Marketing Sync"
                  {...field}
                />
              )}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Project</Label>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <select
                  id="projectId"
                  {...field}
                  className="w-full h-10 border-input border rounded-[var(--radius-field)] px-3 bg-background"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.projectId && (
              <p className="text-sm text-destructive">
                {errors.projectId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Input
                  id="tags"
                  placeholder="e.g., client-facing, critical, q3"
                  {...field}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Audio File</Label>
            <Controller
              name="file"
              control={control}
              render={() => <FileUpload onFileSelect={handleFileSelect} />}
            />
            {errors.file && (
              <p className="text-sm text-destructive">{errors.file.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Add Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
