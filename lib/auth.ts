import { ApiClient } from './api-client';
import { User, UserRole } from './types';

const AUTH_KEY = 'clinic_auth_user';
const TOKEN_KEY = 'auth_token';

export function loginUser(email: string, password: string): User | null {
  throw new Error('loginUser is deprecated. Use ApiClient.login instead.');
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(AUTH_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
  ApiClient.setToken(token);
}

export async function refreshCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_KEY) || ApiClient.getToken();
  if (!token) {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }

  ApiClient.setToken(token);

  try {
    const response = await ApiClient.request<{ user: User }>('/auth/me');
    if (response?.user) {
      setCurrentUser(response.user);
      return response.user;
    }
  } catch {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    ApiClient.clearToken();
  }

  return null;
}

export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
  ApiClient.clearToken();
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function hasRole(requiredRole: UserRole): boolean {
  const user = getCurrentUser();
  return user?.role === requiredRole;
}

export function hasAnyRole(roles: UserRole[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}
