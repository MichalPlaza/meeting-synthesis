import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/lib/api/client";
import { useManagers } from "@/hooks/useManagers";
import { commonSchemas } from "@/lib/form-utils";
import log from "../services/logging";

const registerFormSchema = z
  .object({
    full_name: commonSchemas.name,
    username: commonSchemas.username,
    email: commonSchemas.email,
    password: commonSchemas.password,
    role: z.enum(["developer", "scrum_master", "project_manager"]),
    manager_id: z.string(),
  })
  .refine(
    (data) => {
      if (data.role === "developer" || data.role === "scrum_master") {
        return !!data.manager_id && data.manager_id.length > 0;
      }
      return true;
    },
    {
      message: "Developer and Scrum Master must have a manager selected",
      path: ["manager_id"],
    }
  );

type RegisterFormValues = z.infer<typeof registerFormSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const { managers, isLoading: isLoadingManagers } = useManagers();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      password: "",
      role: "developer",
      manager_id: "",
    },
  });

  const selectedRole = form.watch("role");

  async function onSubmit(values: RegisterFormValues) {
    log.info("Registration attempt for user:", values.username);

    try {
      const payload = {
        ...values,
        manager_id: values.role === "developer" || values.role === "scrum_master" ? values.manager_id : null,
      };

      await api.post("/auth/register", payload);

      log.info("Account created successfully for user:", values.username);
      toast.success("Account created successfully! You can now log in.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      log.error("Error sending registration request:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred while connecting to the server.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-center text-3xl font-bold tracking-tight">Create an account</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="email"
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
                    <Input type="password" placeholder="Your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <SimpleSelect
                      options={[
                        { value: "developer", label: "Developer" },
                        { value: "scrum_master", label: "Scrum Master" },
                        { value: "project_manager", label: "Project Manager" },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select role"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(selectedRole === "developer" || selectedRole === "scrum_master") && (
              <FormField
                control={form.control}
                name="manager_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager</FormLabel>
                    <FormControl>
                      <SimpleSelect
                        options={managers.map((m) => ({ value: m.id, label: m.full_name }))}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={isLoadingManagers ? "Loading managers..." : "Select manager"}
                        disabled={isLoadingManagers}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full mt-4" size="lg" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Form>

        <p className="text-center subtle mt-2">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-foreground hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
