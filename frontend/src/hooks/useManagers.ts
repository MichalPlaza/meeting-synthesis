import { useAuth } from '@/contexts/AuthContext';
import { useApi } from './useApi';
import { toast } from 'sonner';

interface Manager {
  id: string;
  full_name: string;
}

interface ManagerResponse {
  _id: string;
  full_name: string;
}

/**
 * Hook to fetch and manage list of managers (Project Managers and Admins)
 *
 * This hook automatically fetches managers when the component mounts and provides
 * loading/error states. It uses the authenticated user's token from AuthContext.
 *
 * @param enabled - Whether to enable automatic fetching (default: true)
 * @returns Object containing managers array, loading state, and error
 *
 * @example
 * ```tsx
 * const { managers, isLoading, error } = useManagers();
 *
 * if (isLoading) return <div>Loading managers...</div>;
 * if (error) return <div>Failed to load managers</div>;
 *
 * return (
 *   <select>
 *     {managers.map(m => (
 *       <option key={m.id} value={m.id}>{m.full_name}</option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useManagers(enabled = true) {
  const { token } = useAuth();

  const { data, isLoading, error } = useApi<ManagerResponse[]>(
    '/users/managers',
    {
      enabled,
      token: token || undefined,
      onError: () => {
        toast.error('Failed to load managers. Please try refreshing.');
      },
    }
  );

  // Transform API response to expected format
  const managers: Manager[] = data?.map(m => ({
    id: m._id,
    full_name: m.full_name,
  })) || [];

  return { managers, isLoading, error };
}
