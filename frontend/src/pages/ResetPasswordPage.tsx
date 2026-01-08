import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";
import { api } from "@/lib/api/client";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";

const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." }),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

type TokenStatus = "loading" | "valid" | "invalid" | "expired";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  const { isSubmitting } = form.formState;

  // Verify token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenStatus("invalid");
        return;
      }

      try {
        await api.get(`/auth/password-reset/verify/${token}`);
        setTokenStatus("valid");
      } catch (error: any) {
        if (error?.detail?.includes("expired")) {
          setTokenStatus("expired");
        } else {
          setTokenStatus("invalid");
        }
      }
    }

    verifyToken();
  }, [token]);

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) return;

    try {
      await api.post("/auth/password-reset/confirm", {
        token,
        new_password: values.new_password,
      });
      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch (error: any) {
      const message = error?.detail || "Failed to reset password. Please try again.";
      toast.error(message);
    }
  }

  // Loading state
  if (tokenStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (tokenStatus === "invalid" || tokenStatus === "expired") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {tokenStatus === "expired" ? "Link expired" : "Invalid link"}
          </h1>
          <p className="text-muted-foreground">
            {tokenStatus === "expired"
              ? "This password reset link has expired. Please request a new one."
              : "This password reset link is invalid or has already been used."}
          </p>
          <div className="pt-4 space-y-3">
            <Link to="/forgot-password" className="block">
              <Button className="w-full">Request new reset link</Button>
            </Link>
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Password reset!</h1>
          <p className="text-muted-foreground">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <div className="pt-4">
            <Link to="/login" className="block">
              <Button className="w-full">Go to login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground">Enter your new password below.</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm new password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full !mt-6"
              size="lg"
              loading={isSubmitting}
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </Form>
        <p className="text-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
