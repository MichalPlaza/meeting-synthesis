import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SingleSelect } from "@/components/ui/SingleSelect";
import log from "../services/logging";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const registerFormSchema = z
  .object({
    full_name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    username: z.string().min(3, { message: "Username must be at least 3 characters." }),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
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
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
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

  const selectedRole = watch("role");

  useEffect(() => {
    async function fetchManagers() {
      try {
        log.info("Fetching managers list for registration form");
        const res = await fetch(`${BACKEND_API_BASE_URL}/users/managers`);
        if (!res.ok) throw new Error("Failed to fetch managers");
        const data = await res.json();
        setManagers(data.map((u: { _id: string; full_name: string }) => ({ id: u._id, full_name: u.full_name })));
        log.info(`Fetched ${data.length} managers`);
      } catch (err) {
        log.error("Error fetching managers:", err);
        toast.error("Failed to load managers. Try refreshing the page.");
      }
    }
    fetchManagers();
  }, []);

  async function onSubmit(values: RegisterFormValues) {
    log.info("Registration attempt for user:", values.username);

    try {
      const payload = {
        ...values,
        manager_id: values.role === "developer" || values.role === "scrum_master" ? values.manager_id : null,
      };

      const response = await fetch(`${BACKEND_API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const detailMessage = errorData.detail || "Registration failed. Please try again.";
        log.warn("Registration failed for user:", values.username, "Error:", detailMessage);
        toast.error(detailMessage);
        return;
      }

      log.info("Account created successfully for user:", values.username);
      toast.success("Account created successfully! You can now log in.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      log.error("Error sending registration request:", error);
      toast.error("An error occurred while connecting to the server.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-center text-3xl font-bold tracking-tight">Create an account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <Controller
            name="full_name"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <label className="block mb-1">Name</label>
                <Input placeholder="Your name" {...field} />
                {fieldState.error && <p className="text-red-500">{fieldState.error.message}</p>}
              </div>
            )}
          />

          {/* Username */}
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <label className="block mb-1">Username</label>
                <Input placeholder="Your username" {...field} />
                {fieldState.error && <p className="text-red-500">{fieldState.error.message}</p>}
              </div>
            )}
          />

          {/* Email */}
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <label className="block mb-1">Email</label>
                <Input type="email" placeholder="Your email" {...field} />
                {fieldState.error && <p className="text-red-500">{fieldState.error.message}</p>}
              </div>
            )}
          />

          {/* Password */}
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <label className="block mb-1">Password</label>
                <Input type="password" placeholder="Your password" {...field} />
                {fieldState.error && <p className="text-red-500">{fieldState.error.message}</p>}
              </div>
            )}
          />

          {/* Role */}
          <Controller
            name="role"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <label className="block mb-1">Role</label>
                <SingleSelect
                  options={[
                    { value: "developer", label: "Developer" },
                    { value: "scrum_master", label: "Scrum Master" },
                    { value: "project_manager", label: "Project Manager" },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select role"
                />
                {fieldState.error && <p className="text-red-500">{fieldState.error.message}</p>}
              </div>
            )}
          />


          {/* Manager */}
          {(selectedRole === "developer" || selectedRole === "scrum_master") && (
            <Controller
              name="manager_id"
              control={control}
              render={({ field, fieldState }) => (
                <div>
                  <label className="block mb-1">Manager</label>
                  <SingleSelect
                    options={managers.map((m) => ({ value: m.id, label: m.full_name }))}
                    value={field.value || null}      // RHF trzyma wartość
                    onValueChange={field.onChange}   // RHF aktualizuje wartość
                    placeholder="Select manager"
                  />
                  {fieldState.error && <p className="text-red-500">{fieldState.error.message}</p>}
                </div>
              )}
            />
          )}

          <Button type="submit" className="w-full mt-4" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

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
