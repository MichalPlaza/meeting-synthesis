import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import log from "@/services/logging";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/AuthContext";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const addUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters"),
  role: z.enum(["developer", "scrum_master", "project_manager", "admin"], {
    required_error: "Please select a role",
  }),
  manager_id: z.string().optional(),
});

type AddUserValues = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function AddUserDialog({
  isOpen,
  onOpenChange,
  onUserCreated,
}: AddUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>(
    []
  );

  const form = useForm<AddUserValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      full_name: "",
      role: "developer",
      manager_id: "",
    },
  });

  const selectedRole = form.watch("role");

  useEffect(() => {
    async function fetchManagers() {
      if (!isOpen) return;
      try {
        log.info("Fetching managers list for Add User dialog");
        const res = await fetch(`${BACKEND_API_BASE_URL}/users/managers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch managers");
        const data = await res.json();
        setManagers(
          data.map((u: { _id: string; full_name: string }) => ({ id: u._id, full_name: u.full_name }))
        );
        log.info(`Fetched ${data.length} managers`);
      } catch (err) {
        log.error("Error fetching managers:", err);
        toast.error(
          "Failed to load managers. Please try closing and reopening the dialog."
        );
      }
    }
    fetchManagers();
  }, [isOpen, token]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: AddUserValues) => {
    if (!token) {
      toast.error("You must be logged in to create a user");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        manager_id:
          data.role === "developer" || data.role === "scrum_master"
            ? data.manager_id
            : null,
      };

      const response = await fetch(`${BACKEND_API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create user");
      }

      toast.success("User created successfully!");
      handleClose();
      onUserCreated();
    } catch (error) {
      log.error("Error creating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. Fill in all required fields below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="johndoe"
                      {...field}
                      disabled={isSubmitting}
                    />
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
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      disabled={isSubmitting}
                    />
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
                      placeholder="••••••••"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="scrum_master">Scrum Master</SelectItem>
                      <SelectItem value="project_manager">
                        Project Manager
                      </SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="scrum_master">Scrum Master</SelectItem>
                      <SelectItem value="project_manager">
                        Project Manager
                      </SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(selectedRole === "developer" ||
              selectedRole === "scrum_master") && (
              <FormField
                control={form.control}
                name="manager_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
