import { useAuth } from "@/AuthContext";
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

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const loginFormSchema = z.object({
  username_or_email: z
    .string()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email." }),
  password: z.string().min(1, { message: "Password is required." }),
  remember_me: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

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
    const loginApiUrl = `${BACKEND_API_BASE_URL}/auth/login`;
    const userApiUrl = `${BACKEND_API_BASE_URL}/users/me`;

    try {
      const response = await fetch(loginApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(
          errorData.detail || "Login failed. Please check your credentials."
        );
        return;
      }

      const tokenData = await response.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      const userResponse = await fetch(userApiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
        toast.error("Login successful, but could not fetch user info.");
        return;
      }

      const userData = await userResponse.json();
      login(accessToken, userData, refreshToken);
      navigate("/");
      toast.success(
        `Welcome back, ${userData.full_name || userData.username}!`
      );
    } catch (error) {
      console.error("Error sending login request:", error);
      toast.error("An error occurred while connecting to the server.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-center">Log in to your account</h2>
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
                <FormItem className="flex flex-row items-center space-x-2 pt-2">
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
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full !mt-6"
              size="lg"
              disabled={isSubmitting}
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
  );
}

export default LoginPage;
