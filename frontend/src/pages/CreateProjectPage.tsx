import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import * as z from 'zod';

// Import Shadcn UI components
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; 

import { useAuth } from '@/AuthContext'; 

const BACKEND_API_BASE_URL = 'http://localhost:8000'; 

const HARDCODED_USERS = [
  { id: 'user-abc', username: 'user_abc', email: 'abc@example.com', full_name: 'Alice' },
  { id: 'user-def', username: 'user_def', email: 'def@example.com', full_name: 'Bob' },
  { id: 'user-xyz', username: 'user_xyz', email: 'xyz@example.com', full_name: 'Charlie' },
  { id: 'user-123', username: 'user_123', email: '123@example.com', full_name: 'David' },
  // Add more fake users as needed
];

const createProjectFormSchema = z.object({
  name: z.string().min(1, {
    message: 'Project name is required.',
  }),
  description: z.string().min(1, { 
    message: 'Project description is required.',
  }),
  meeting_datetime: z.string().min(1, { 
      message: 'Meeting datetime is required..',
  }),
  selectedMemberIds: z.array(z.string()).optional(),
});

type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

function CreateProjectPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { token, logout } = useAuth(); 

  const currentUserId = null; 

  const selectableUsers = HARDCODED_USERS.filter(u => u.id !== currentUserId);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      meeting_datetime: '', 
      selectedMemberIds: [],
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: CreateProjectFormValues) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUserId || !token) {
        setErrorMessage("Bạn cần đăng nhập để tạo project."); 
        return;
    }

    const backendApiUrl = `${BACKEND_API_BASE_URL}/project`; 

    try {
        const requestBody = {
            name: values.name,
            description: values.description,
            meeting_datetime: new Date(values.meeting_datetime).toISOString(), 
            owner_id: currentUserId, 
            members_ids: [currentUserId],
        };

        const response = await fetch(backendApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`, 
            },
            body: JSON.stringify(requestBody), 
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                 setErrorMessage("Bạn cần đăng nhập lại để thực hiện thao tác này.");
                 logout(); 
                 navigate('/login');
            } else {
                 setErrorMessage(errorData.detail || 'Tạo project thất bại. Vui lòng thử lại.');
            }
            return;
        }

        const newProject = await response.json(); // API có thể trả về object project vừa tạo
        console.log('Project created successfully!', newProject);

        setSuccessMessage('Project created successfully!');
        form.reset(); 

    } catch (error) {
        console.error('Error submitting new project:', error);
        setErrorMessage('An error occurred connecting to the server. Please try again later.');
    }
  }

  return (
    <>
    <div className="absolute top-25 left-15">
      <Link to="/projects" className="text-blue-600 hover:underline flex items-center space-x-1">
        ← <span>Back to Projects</span>  
      </Link>
    </div>

    <div className="container mx-auto p-6 max-w-sm relative">

      <h2 className="text-2xl font-bold mb-6 text-center">Create New Project</h2>

      {successMessage && (
         <p className="text-green-500 text-sm mb-4 text-center">{successMessage}</p>
      )}
      {errorMessage && (
        <p className="text-red-500 text-sm mb-4 text-center">{errorMessage}</p>
      )}

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
                  <Textarea placeholder="Enter project description" {...field} /> 
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

          <FormField
            control={form.control}
            name="selectedMemberIds" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Members (Hold Ctrl to select multiple)</FormLabel> 
                <FormControl>
                  {/* Use a native HTML select element with the 'multiple' attribute */}
                  <select
                    {...field} // Spread react-hook-form's field props (name, value, onBlur)
                    multiple // Enable multi-selection
                    // value expects an array of selected option values
                    // onChange needs custom handling for multiple selection
                    onChange={(event) => {
                      // Convert HTMLCollection of selected options to an array of their values (IDs)
                      const selectedValues = Array.from(event.target.selectedOptions, option => option.value);
                      field.onChange(selectedValues); // Update form state with the array of IDs
                    }}
                    // Add some basic styling with Tailwind
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    // Style height and overflow for multiple options
                     style={{ height: 'auto', overflowY: 'auto' }}
                  >
                    {/* Map hardcoded users to option elements */}
                    {selectableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage /> 
              </FormItem>
            )}
          />

        
          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </form>
      </Form>

    </div>
    </>
  );
}

export default CreateProjectPage;