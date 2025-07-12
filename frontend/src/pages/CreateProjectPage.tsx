import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import * as z from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/AuthContext";
import type { UserResponse } from "@/types/user";

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const createProjectFormSchema = z.object({
  name: z.string().min(1, {
    message: "Project name is required.",
  }),
  description: z.string().min(1, {
    message: "Project description is required.",
  }),
  meeting_datetime: z.string().min(1, {
    message: "Meeting datetime is required.",
  }),
  selectedMemberIds: z.array(z.string()).optional(),
});

type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

function CreateProjectPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const { user, token, logout } = useAuth();
  const currentUserId = user?._id;

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setUsersError("Authentication token not available.");
        setUsersLoading(false);
        return;
      }

      setUsersLoading(true);
      setUsersError(null);

      const usersApiUrl = `${BACKEND_API_BASE_URL}/users`;

      try {
        const response = await fetch(usersApiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            setUsersError("Session expired. Please log in again.");
            logout();
            navigate("/login");
          } else {
            setUsersError(errorData.detail || "Failed to fetch users.");
          }
          setAllUsers([]);
          return;
        }

        const usersData: UserResponse[] = await response.json();
        const selectableUsersList = usersData.filter(
          (u) => u._id !== currentUserId
        );
        setAllUsers(selectableUsersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsersError("Failed to connect to server to fetch users.");
        setAllUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    if (token) {
      fetchUsers();
    } else {
      setUsersLoading(false);
      setUsersError("User not authenticated.");
    }
  }, [token, logout, navigate, currentUserId]);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      meeting_datetime: "",
      selectedMemberIds: [],
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: CreateProjectFormValues) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUserId || !token) {
      setErrorMessage("You need to be logged in to create a project.");
      return;
    }

    const memberIdsArray = values.selectedMemberIds || [];
    if (!memberIdsArray.includes(currentUserId)) {
      memberIdsArray.unshift(currentUserId);
    }

    const requestBody = {
      name: values.name,
      description: values.description,
      meeting_datetime: new Date(values.meeting_datetime).toISOString(),
      owner_id: currentUserId,
      members_ids: memberIdsArray,
    };

    const backendApiUrl = `${BACKEND_API_BASE_URL}/project`;
    try {
      const response = await fetch(backendApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setErrorMessage("Session expired. Please log in again.");
          logout();
          navigate("/login");
        } else {
          setErrorMessage(
            errorData.detail || "Project creation failed. Please try again."
          );
        }
        return;
      }

      setSuccessMessage("Project created successfully!");
      form.reset();
      setTimeout(() => navigate("/projects"), 1500);
    } catch (error) {
      console.error("Error submitting new project:", error);
      setErrorMessage(
        "An error occurred while submitting the project. Please try again later."
      );
    }
  }

  return (
    <div className="space-y-12">
      <Link to="/projects" className="link inline-flex items-center gap-2">
        ← <span>Back to Projects</span>
      </Link>

      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h2>Create New Project</h2>
          <p className="lead">
            Fill in the details below to start a new project.
          </p>
        </div>

        {successMessage && (
          <p className="text-success-foreground text-center bg-success/20 p-3 rounded-[var(--radius-container)]">
            {successMessage}
          </p>
        )}
        {errorMessage && (
          <p className="text-destructive-foreground text-center bg-destructive/80 p-3 rounded-[var(--radius-container)]">
            {errorMessage}
          </p>
        )}

        {usersLoading && (
          <p className="text-center text-muted-foreground">Loading users...</p>
        )}
        {usersError && (
          <p className="text-center text-destructive">{usersError}</p>
        )}

        {!usersLoading && !usersError ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter project description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meeting_datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Datetime</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="selectedMemberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select Members (Hold Ctrl to select multiple)
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        multiple
                        onChange={(event) => {
                          const selectedValues = Array.from(
                            event.target.selectedOptions,
                            (option) => option.value
                          );
                          field.onChange(selectedValues);
                        }}
                        className="flex h-32 w-full rounded-[var(--radius-field)] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={form.formState.isSubmitting}
                      >
                        {allUsers.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.full_name || user.username} ({user.email})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full !mt-8"
                size="lg"
                disabled={isSubmitting || usersLoading}
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </Form>
        ) : null}
      </div>
    </div>
  );
}

export default CreateProjectPage;
