import { csrfHeaders } from './csrf';

/**
 * Lightweight API helper that wraps fetch with common conventions:
 *  - prepends VITE_API_URL (when set) for production deployments
 *  - relative URL in dev (Vite proxy forwards to backend)
 *  - credentials: 'include'
 *  - CSRF header on mutating requests
 *  - automatic JSON parsing
 */

// Get API base URL from environment (empty in dev for relative URLs)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add CSRF header for state-changing methods
  const method = (options.method ?? 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    Object.assign(headers, csrfHeaders());
  }

  // Add JSON content-type when body is an object (skip for FormData)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Prepend base URL if configured
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),

  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T = any>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  del: <T = any>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};

/**
 * Helper to build full URL with API base (for use with raw fetch)
 * Prefer using the `api` object above instead when possible.
 */
export function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}
