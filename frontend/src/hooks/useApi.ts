import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api/client';
import log from '@/services/logging';

interface UseApiOptions {
  /**
   * Whether to enable automatic fetching on mount
   * @default true
   */
  enabled?: boolean;
  /**
   * Authentication token to include in requests
   */
  token?: string;
  /**
   * Callback function called on successful fetch
   */
  onSuccess?: (data: any) => void;
  /**
   * Callback function called on error
   */
  onError?: (error: ApiError) => void;
}

interface UseApiReturn<T> {
  /**
   * The fetched data, or null if not yet loaded
   */
  data: T | null;
  /**
   * Whether the request is currently in progress
   */
  isLoading: boolean;
  /**
   * Error object if the request failed
   */
  error: ApiError | null;
  /**
   * Function to manually refetch the data
   */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching data from API endpoints with automatic loading and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useApi<User[]>('/users', {
 *   token: 'auth-token',
 *   onSuccess: (users) => console.log('Loaded users:', users),
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * return <div>{data?.length} users</div>;
 * ```
 */
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const { enabled = true, token, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      log.debug(`Fetching: ${endpoint}`);
      const result = await api.get<T>(endpoint, token);
      setData(result);
      onSuccess?.(result);
      log.debug(`Fetched: ${endpoint}`);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      onError?.(apiError);
      log.error(`Error fetching ${endpoint}:`, apiError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, enabled, token]);

  return { data, isLoading, error, refetch: fetchData };
}
