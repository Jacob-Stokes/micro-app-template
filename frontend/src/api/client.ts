export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const rawText = await response.text();
  let parsed: ApiResponse<T>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(rawText || 'API response could not be parsed');
  }

  if (!parsed.success) {
    throw new Error(parsed.error || 'API request failed');
  }

  return parsed.data as T;
}

export const api = {
  // Auth
  getMe: () => apiRequest<any>('/api/auth/me'),
  login: (username: string, password: string) =>
    apiRequest<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, email?: string) =>
    apiRequest<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    }),
  logout: () =>
    apiRequest<any>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<any>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // API Keys
  getApiKeys: () => apiRequest<any[]>('/api/auth/api-keys'),
  createApiKey: (name: string, expiresInDays?: number) =>
    apiRequest<any>('/api/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, expiresInDays }),
    }),
  deleteApiKey: (id: string) =>
    apiRequest<any>(`/api/auth/api-keys/${id}`, { method: 'DELETE' }),

  // ─── Your domain endpoints go here ───────────────────────
  // Example:
  getItems: () => apiRequest<any[]>('/api/items'),
  createItem: (title: string, description?: string) =>
    apiRequest<any>('/api/items', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),
  deleteItem: (id: string) =>
    apiRequest<any>(`/api/items/${id}`, { method: 'DELETE' }),
};
