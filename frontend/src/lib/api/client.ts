/**
 * Centralized API client for all backend requests
 *
 * This client provides a consistent interface for making HTTP requests to the backend,
 * with standardized error handling, authentication token injection, and type safety.
 */

const API_BASE = import.meta.env.VITE_BACKEND_API_BASE_URL;

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestConfig extends RequestInit {
  token?: string;
}

/**
 * Internal request function that handles all HTTP calls
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { token, ...fetchConfig } = config;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchConfig.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchConfig,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.detail || response.statusText,
      response.status,
      error.detail
    );
  }

  return response.json();
}

/**
 * API client with methods for common HTTP operations
 */
export const api = {
  /**
   * GET request
   * @param endpoint - API endpoint (e.g., '/users')
   * @param token - Optional authentication token
   */
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { token }),

  /**
   * POST request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param token - Optional authentication token
   */
  post: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      token
    }),

  /**
   * PUT request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param token - Optional authentication token
   */
  put: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      token
    }),

  /**
   * PATCH request
   * @param endpoint - API endpoint
   * @param data - Request body data
   * @param token - Optional authentication token
   */
  patch: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token
    }),

  /**
   * DELETE request
   * @param endpoint - API endpoint
   * @param token - Optional authentication token
   */
  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),
};

/**
 * Get the base API URL for special cases (e.g., file uploads with axios)
 */
export const getApiBaseUrl = () => API_BASE;
