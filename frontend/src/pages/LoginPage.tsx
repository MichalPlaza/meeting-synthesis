import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import z from 'zod';

const BACKEND_API_BASE_URL = 'http://localhost:8000';

const loginFormSchema = z.object({
  username_or_email: z.string().min(1, {
    message: 'Username or Email is required.',
  }).email({
    message: 'Invalid email.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema), 
    defaultValues: {
      username_or_email: '',
      password: '',
    },
  });

  const { isSubmitting } = form.formState;
  
  async function onSubmit(values: LoginFormValues) {
    setErrorMessage(null); 

    const backendApiUrl = `${BACKEND_API_BASE_URL}/auth/login`;

    try {
      const response = await fetch(backendApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.detail || 'Login failed. Please check your Email and Password again.');
        return; 
      }

      // Login successful
      const tokenData = await response.json();
      console.log('Login successful!', tokenData);

      // storage token (simple)
      localStorage.setItem('access_token', tokenData.access_token);
      localStorage.setItem('token_type', tokenData.token_type);

      // Redirect to main page
      navigate('/');

    } catch (error) {
      console.error('Error sending login request:', error);
      setErrorMessage('An error occurred while connecting to the server. Please try again later.');
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-sm"> 
      <h2 className="text-2xl font-bold mb-6 text-center">Welcome to <br></br> Meeting Synthesis</h2>

      {/* Display common API errors */}
      {errorMessage && (
        <p className="text-red-500 text-sm mb-4 text-center">{errorMessage}</p>
      )}

      <Form {...form}> 
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* User or Email field */}
          <FormField
            control={form.control} 
            name="username_or_email" 
            render={({ field }) => ( 
              <FormItem>
                <FormLabel>Username or Email</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Username or Email" {...field} />
                </FormControl>
                <FormMessage /> 
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Log in'}
          </Button>
        </form>
      </Form>

      {/* Link to register page */}
      <p className="text-center text-sm text-gray-600 mt-4">
        Don't have an account?{' '}
        <button
          onClick={() => navigate('/register')} 
          className="text-blue-600 hover:underline"
          type="button"
        >
          Sign up now
        </button>
      </p>

    </div>
  );
}

export default LoginPage;