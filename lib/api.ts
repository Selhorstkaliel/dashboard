const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL || 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  status: number;
}

export class ApiException extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiException';
  }
}

export async function apiFetch<T>(
  path: string, 
  init?: RequestInit
): Promise<T> {
  const url = `${BASE_API_URL}${path}`;
  
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiException(errorMessage, response.status);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

// Helper functions for common API patterns
export const apiGet = <T>(path: string) => apiFetch<T>(path);

export const apiPost = <T>(path: string, data: unknown) => 
  apiFetch<T>(path, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
    headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
  });

export const apiPatch = <T>(path: string, data: unknown) => 
  apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const apiDelete = <T>(path: string) => 
  apiFetch<T>(path, {
    method: 'DELETE',
  });