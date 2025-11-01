import { useState, useEffect } from "react";
import { useAuth } from "@/AuthContext";
import { Loader2, MessageSquare, Send, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

interface Comment {
  author_id: string;
  _id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export function MeetingCommentsSection({ meetingId }: { meetingId: string }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/comments/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/comments/${meetingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setNewComment("");
      await fetchComments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`${BACKEND_API_BASE_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      setError("Failed to delete comment");
    }
  };

  useEffect(() => {
    fetchComments();
  }, [meetingId]);

  return (
    <div className="mt-12 border rounded-[var(--radius-container)] p-6 bg-card shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquare size={20} />
        <h3>Comments</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading comments...
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">{error}</div>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          No comments yet. Be the first to say something smart.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment._id} className="p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{comment.author_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
                {user?._id === comment.author_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={4} className="bg-white border rounded-md shadow-md">
                      <DropdownMenuItem onClick={() => alert("Edit " + comment._id)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(comment._id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <Separator className="my-2" />
              <p className="text-sm text-foreground/90 whitespace-pre-line">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t space-y-3">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none h-24"
        />
        <div className="flex justify-end">
          <Button onClick={handleAddComment} disabled={submitting || !newComment.trim()}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Post Comment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
