/**
 * API client module for communicating with the FastAPI backend.
 * All frontend-to-backend requests go through this module to ensure
 * consistent headers, error handling, and base URL configuration.
 */

// Base URL for the FastAPI backend server.
// Uses the NEXT_PUBLIC_API_URL environment variable if set,
// otherwise defaults to localhost:8000 for local development.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper that handles JSON responses and errors.
 * Automatically sets Content-Type to JSON and throws on non-OK responses.
 *
 * @template T - The expected response type
 * @param endpoint - The API path (e.g., "/api/questions")
 * @param options - Optional fetch configuration (method, body, headers, etc.)
 * @returns Parsed JSON response of type T
 * @throws Error if the response status is not OK (2xx)
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  // Throw a descriptive error for non-2xx responses
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if the backend API is healthy and responding.
 * Calls the root endpoint which returns app status info.
 *
 * @returns Object with status and app name from the backend
 */
export async function checkHealth(): Promise<{
  status: string;
  app: string;
}> {
  return apiFetch("/");
}
