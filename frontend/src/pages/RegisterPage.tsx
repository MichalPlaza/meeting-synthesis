import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const registerFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  full_name: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      full_name: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: RegisterFormValues) {
    setErrorMessage(null);

    const backendApiUrl = `${BACKEND_API_BASE_URL}/auth/register`;

    try {
      const response = await fetch(backendApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const detailMessage =
          errorData.detail || "Registration failed. Please try again.";
        setErrorMessage(detailMessage);
        toast.error(detailMessage); // Show error toast
        return;
      }

      // Registration successful
      const responseData = await response.json();
      console.log("Registration successful!", responseData);

      // Show success toast instead of alert
      toast.success("Registration successful! You can now log in.");

      // Redirect to login page after a short delay so the user can see the toast
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Error sending registration request:", error);
      const connectionError =
        "An error occurred while connecting to the server. Please try again later.";
      setErrorMessage(connectionError);
      toast.error(connectionError);
    }
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 px-40">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Register New Account
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Username field */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full Name Field (Optional) */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Your fullname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Sign Up"}
            </Button>
          </form>
        </Form>

        {/* Link to login page */}
        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline"
            type="button"
          >
            Sign in now
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
