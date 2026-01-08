import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";
import { api } from "@/lib/api/client";
import { commonSchemas } from "@/lib/form-utils";
import log from "../services/logging";

const loginFormSchema = z.object({
  username_or_email: commonSchemas.email,
  password: z.string().min(1, { message: "Password is required." }),
  remember_me: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

interface UserResponse {
  username: string;
  full_name?: string;
  [key: string]: any;
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username_or_email: "",
      password: "",
      remember_me: true,
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: LoginFormValues) {
    log.info("Login attempt for user:", values.username_or_email);

    try {
      // Get authentication tokens
      const tokenData = await api.post<LoginResponse>("/auth/login", values);
      const { access_token, refresh_token } = tokenData;
      log.debug("Successfully obtained tokens for user:", values.username_or_email);

      // Fetch user info with the access token
      const userData = await api.get<UserResponse>("/users/me", access_token);

      // Login user and redirect
      login(access_token, userData, refresh_token);
      navigate("/");
      log.info("User logged in and redirected to dashboard:", userData.username);
      toast.success(`Welcome back, ${userData.full_name || userData.username}!`);
    } catch (error) {
      log.error("Error during login:", error);
      // Show user-friendly message for network errors
      const isNetworkError = error instanceof Error && error.message === "Failed to fetch";
      const errorMessage = isNetworkError
        ? "An error occurred while connecting to the server."
        : error instanceof Error ? error.message : "An error occurred while connecting to the server.";
      toast.error(errorMessage);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-center text-3xl font-bold tracking-tight">
          Log in to your account
        </h1>
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username_or_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remember_me"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          id="remember-me-checkbox"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="remember-me-checkbox"
                        className="text-sm font-normal text-muted-foreground hover:cursor-pointer"
                      >
                        Remember me
                      </FormLabel>
                    </div>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full !mt-8"
                size="lg"
                loading={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </Form>
          <p className="text-center subtle">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-foreground hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
