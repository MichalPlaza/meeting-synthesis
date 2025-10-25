import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios, { AxiosError } from "axios";
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
import { cn } from "@/lib/utils";
import log from "../services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

// Schemat walidacji pozostaje bez zmian
const addMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  projectId: z.string().min(1, "You must select a project."), // Zmieniamy na min(1) dla pewności
  tags: z.string().optional(),
  file: z.instanceof(File, { message: "An audio file is required." }),
});

type AddMeetingValues = z.infer<typeof addMeetingSchema>;

interface AddMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onMeetingAdded: () => void;
}

export function AddMeetingDialog({
  isOpen,
  onOpenChange,
  projects,
  onMeetingAdded,
}: AddMeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { user, token } = useAuth();

  const form = useForm<AddMeetingValues>({
    resolver: zodResolver(addMeetingSchema),
    defaultValues: {
      title: "",
      projectId: "", // Pusta wartość początkowa
      tags: "",
      file: undefined,
    },
  });

  const { control, handleSubmit, reset } = form;

  // Prosty reset formularza przy otwarciu
  useEffect(() => {
    if (isOpen) {
      log.debug("AddMeetingDialog opened. Resetting form.");
      reset();
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  }, [isOpen, reset]);

  const handleClose = () => {
    log.debug("AddMeetingDialog closed.");
    onOpenChange(false);
  };

  const onSubmit = async (data: AddMeetingValues) => {
    log.info("Attempting to add new meeting:", data.title);
    if (!user || !token) {
      log.warn("AddMeetingDialog: User not logged in.");
      toast.error("You must be logged in to add a meeting.");
      return;
    }
    setIsSubmitting(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("project_id", data.projectId);
    formData.append("uploader_id", user._id);
    formData.append("meeting_datetime", new Date().toISOString());
    formData.append("tags", data.tags || "");
    formData.append("file", data.file);

    try {
      const response = await axios.post(
        `${BACKEND_API_BASE_URL}/meetings/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
            );
            setUploadProgress(percentCompleted);
            log.debug("Upload progress:", percentCompleted, "%");
          },
        }
      );

      const responseData: Meeting & {
        estimated_processing_time_seconds?: number;
      } = response.data;
      const estimationMessage = responseData.estimated_processing_time_seconds
        ? `Estimated processing time: ${formatEstimation(
            responseData.estimated_processing_time_seconds
          )}.`
        : "Processing will start shortly.";

      log.info("Meeting added successfully! Title:", data.title, "Estimation:", estimationMessage);
      toast.success("Meeting added successfully!", {
        description: estimationMessage,
      });

      onMeetingAdded();
      handleClose();
    } catch (error: any) {
      const axiosError = error as AxiosError<any>;
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "An unexpected error occurred.";
      log.error("Error adding meeting:", errorMessage, "Details:", axiosError.response?.data);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
      log.debug("AddMeetingDialog submission finished.");
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
            <fieldset disabled={isSubmitting} className="space-y-6">
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
              {/* --- POCZĄTEK ZMIANY: ZASTĄPIENIE COMBOBOXA --- */}
              <FormField
                control={control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <Label>Project</Label>
                    <FormControl>
                      <select
                        {...field}
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-[var(--radius-field)] border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                          // Pokaż tekst zastępczy, jeśli nic nie jest wybrane
                          field.value === "" && "text-muted-foreground"
                        )}
                      >
                        <option value="" disabled>
                          Select a project...
                        </option>
                        {projects.map((project) => (
                          <option key={project._id} value={project._id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* --- KONIEC ZMIANY --- */}
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
                      <FileUpload
                        onFileSelect={(file) => field.onChange(file)}
                        progress={uploadProgress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
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
