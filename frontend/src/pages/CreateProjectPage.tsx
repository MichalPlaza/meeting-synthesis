import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import * as z from "zod";

// Import Shadcn UI components
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

// Import hook xác thực để lấy user info và token
import { useAuth } from "@/AuthContext"; // Correct import path if AuthContext is in src/contexts

// Import UserResponse schema for fetched users data type
// Import UserResponse schema for fetched users data type
import type { UserResponse } from "@/types/user"; // Assuming UserResponse is defined in src/types/user.ts
// Assuming UserResponse is defined in src/types/user.ts

// Define backend API base URL
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

// === Zod Validation Schema ===
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
  // Array of selected member IDs (string array)
  selectedMemberIds: z.array(z.string()).optional(), // Optional for now
});

type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

// Assuming UserResponse is defined in src/types/user.ts like this:
// export interface UserResponse { id: string; username: string; email: string; full_name?: string; /* ...other fields */ }
// If not, define a similar interface here or in a types file

function CreateProjectPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null); // State for users fetch error
  const [usersLoading, setUsersLoading] = useState(true); // State for users fetch loading
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]); // State for fetched users

  // Get current user info and token from Auth Context
  const { user, token, logout } = useAuth();
  // Get user ID from Context user object (assuming user object has _id or id)
  const currentUserId = user?._id;

  // === Fetch Users for Member Selection ===
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        // Should be protected by ProtectedRoute, but safety check
        setUsersError("Authentication token not available.");
        setUsersLoading(false);
        return;
      }

      setUsersLoading(true);
      setUsersError(null);

      const usersApiUrl = `${BACKEND_API_BASE_URL}/users`; // API endpoint to get all users

      try {
        const response = await fetch(usersApiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Include token
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            // Token invalid or expired, logout user
            setUsersError("Session expired. Please log in again.");
            logout();
            navigate("/login");
          } else {
            setUsersError(errorData.detail || "Failed to fetch users.");
          }
          setAllUsers([]); // Clear users on error
          return;
        }

        const usersData: UserResponse[] = await response.json();
        // Optional: Filter out the current user from the selection list
        // You might or might not want to select the owner as a member via dropdown
        // If API automatically adds owner to members, filter owner here.
        // If API requires owner in members_ids input, don't filter here.
        console.log(usersData);
        const selectableUsersList = usersData.filter(
          (u) => u._id !== currentUserId
        ); // Example: filter out owner
        setAllUsers(selectableUsersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsersError("Failed to connect to server to fetch users.");
        setAllUsers([]); // Clear users on error
      } finally {
        setUsersLoading(false);
      }
    };

    if (token) {
      // Only fetch if token is available (user is likely logged in)
      fetchUsers();
    } else {
      // If component renders without token (ProtectedRoute should prevent this)
      setUsersLoading(false);
      setUsersError("User not authenticated.");
    }
  }, [token, logout, navigate, currentUserId]); // Depend on token, and auth hooks

  // Filter out the current user from the selection list if needed, even if fetch wasn't filtered
  // This ensures owner is not in the options if you don't want them selectable
  const selectableUsers = allUsers; // Use the fetched list (already potentially filtered in useEffect)

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

  // === Handle Form Submission ===
  async function onSubmit(values: CreateProjectFormValues) {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic check if user is logged in (redundant if using ProtectedRoute correctly, but safe)
    if (!currentUserId || !token) {
      setErrorMessage("You need to be logged in to create a project.");
      // navigate('/login'); // Consider redirecting
      return;
    }

    // Prepare data to send to Backend API POST /project
    const memberIdsArray = values.selectedMemberIds || []; // Get selected IDs from form state

    // Ensure owner is in member_ids if API requires it in the input body on create
    // This is specific to your API requirement. In a standard API, backend handles this by reading token.
    // Based on your API spec needing owner_id and members_ids in the body:
    if (!memberIdsArray.includes(currentUserId)) {
      memberIdsArray.unshift(currentUserId); // Add owner ID to the beginning if not included
    }

    const requestBody = {
      name: values.name,
      description: values.description,
      // Convert datetime-local string to ISO string required by API
      meeting_datetime: new Date(values.meeting_datetime).toISOString(),
      owner_id: currentUserId, // Assuming API *requires* frontend to send this (INSECURE DESIGN)
      members_ids: memberIdsArray, // Send the array of selected member IDs
    };

    console.log("Submitting project data:", requestBody); // Log data being sent

    // === UNCOMMENT ACTUAL API SUBMISSION ===
    const backendApiUrl = `${BACKEND_API_BASE_URL}/project`;
    try {
      const response = await fetch(backendApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Include token for protected endpoint
        },
        body: JSON.stringify(requestBody), // Send the prepared data
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          setErrorMessage("Session expired. Please log in again.");
          logout(); // Logout frontend state
          navigate("/login"); // Redirect
        } else {
          setErrorMessage(
            errorData.detail || "Project creation failed. Please try again."
          );
        }
        return; // Stop here if fetch failed
      }

      // Project created successfully
      const newProject = await response.json(); // Assuming API returns the created project
      console.log("Project created successfully!", newProject);

      setSuccessMessage("Project created successfully!");
      form.reset(); // Reset form on success

      // Optional: Redirect to the new project details page or project list
      // navigate(`/projects/${newProject._id}`); // Assuming API returns _id
      setTimeout(() => navigate("/projects"), 1500); // Navigate to projects list after 1.5 seconds
    } catch (error) {
      console.error("Error submitting new project:", error);
      setErrorMessage(
        "An error occurred while submitting the project. Please try again later."
      );
    }
  }

  // === Render Form UI ===
  return (
    <>
      <div className="absolute top-30 left-15">
        <Link
          to="/projects"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-2 text-m font-medium"
        >
          ← <span>Back to Projects</span>
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md bg-white p-6 rounded-lg shadow-lg relative">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Create New Project
        </h2>

        {/* Display success/error messages */}
        {successMessage && (
          <p className="text-green-500 text-sm mb-4 text-center">
            {successMessage}
          </p>
        )}
        {errorMessage && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {errorMessage}
          </p>
        )}

        {/* Loading/Error messages for fetching users */}
        {usersLoading && (
          <p className="text-center text-gray-600">Loading users...</p>
        )}
        {usersError && <p className="text-center text-red-500">{usersError}</p>}

        {/* Shadcn UI Form - Only render form if users are loaded and no fetch error */}
        {!usersLoading && !usersError ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name Field */}
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

              {/* Description Field */}
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

              {/* Meeting_datetime Field */}
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

              {/* Member Selection Field (Multi-select dropdown) */}
              <FormField
                control={form.control}
                name="selectedMemberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select Members (Hold Ctrl to select multiple)
                    </FormLabel>
                    <FormControl>
                      {/* Use a native HTML select element */}
                      <select
                        {...field}
                        multiple // Enable multi-selection
                        onChange={(event) => {
                          const selectedValues = Array.from(
                            event.target.selectedOptions,
                            (option) => option.value
                          );
                          field.onChange(selectedValues);
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ height: "150px", overflowY: "auto" }}
                        disabled={form.formState.isSubmitting}
                      >
                        {/* Map fetched users to option elements */}
                        {selectableUsers.map((user) => (
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || usersLoading}
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </Form>
        ) : null}
      </div>
    </>
  );
}

export default CreateProjectPage;
