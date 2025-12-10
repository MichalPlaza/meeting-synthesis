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
import { toast } from "sonner";
import type { Meeting } from "@/types/meeting";
import { api } from "@/lib/api/client";

const editMeetingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  tags: z.string().optional(),
  summary: z.string().optional(),
  transcription: z.string().optional(),
});

type EditMeetingValues = z.infer<typeof editMeetingSchema>;

interface EditMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting;
  onMeetingUpdated: (updatedMeeting: Meeting) => void;
}

export function EditMeetingDialog({
  isOpen,
  onOpenChange,
  meeting,
  onMeetingUpdated,
}: EditMeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();

  const form = useForm<EditMeetingValues>({
    resolver: zodResolver(editMeetingSchema),
    defaultValues: {
      title: meeting.title,
      tags: meeting.tags?.join(", ") || "",
      summary: meeting.ai_analysis?.summary || "",
      transcription: meeting.transcription?.full_text || "",
    },
  });

  useEffect(() => {
    if (meeting) {
      form.reset({
        title: meeting.title,
        tags: meeting.tags?.join(", ") || "",
        summary: meeting.ai_analysis?.summary || "",
        transcription: meeting.transcription?.full_text || "",
      });
    }
  }, [form, meeting]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: EditMeetingValues) => {
    if (!token) return;

    setIsSubmitting(true);

    try {
      const updatedMeeting = await api.patch<Meeting>(`/meetings/${meeting._id}`, {
        title: data.title,
        tags: data.tags?.split(",").map(t => t.trim()).filter(Boolean),
        ai_analysis: { summary: data.summary },
        transcription: { full_text: data.transcription },
      }, token);

      toast.success("Meeting updated successfully!");
      onMeetingUpdated(updatedMeeting);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Meeting</DialogTitle>
          <DialogDescription>
            Update your meeting details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma separated)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transcription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcription</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[140px]" {...field} />
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
