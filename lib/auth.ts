import { ApiClient } from './api-client';
import { User, UserRole } from './types';

const AUTH_KEY = 'clinic_auth_user';
const TOKEN_KEY = 'auth_token';
export const AUTH_SESSION_KEY = 'clinic_auth_session';
const TAB_AUTH_SESSION_KEY = 'clinic_tab_auth_session';

function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  clearCurrentTabAuthSession();
}

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

export function startAuthSession(user?: User | null): string {
  const existingSessionId =
    typeof window !== 'undefined' ? localStorage.getItem(AUTH_SESSION_KEY) : null;
  const userPrefix = `${user?.id || 'user'}:`;

  if (existingSessionId?.startsWith(userPrefix)) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TAB_AUTH_SESSION_KEY, existingSessionId);
    }
    return existingSessionId;
  }

  const sessionId = `${user?.id || 'user'}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_SESSION_KEY, sessionId);
    sessionStorage.setItem(TAB_AUTH_SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function getAuthSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_SESSION_KEY);
}

export function getTabAuthSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TAB_AUTH_SESSION_KEY);
}

export function adoptCurrentAuthSession(): string | null {
  if (typeof window === 'undefined') return null;

  const currentSession = getAuthSessionId();
  if (!currentSession) return null;

  sessionStorage.setItem(TAB_AUTH_SESSION_KEY, currentSession);
  return currentSession;
}

export function isCurrentTabAuthSessionActive(): boolean {
  if (typeof window === 'undefined') return false;

  const currentSession = getAuthSessionId();
  const tabSession = getTabAuthSessionId();

  return Boolean(currentSession && tabSession && currentSession === tabSession);
}

export function clearCurrentTabAuthSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(TAB_AUTH_SESSION_KEY);
  }
}

export async function refreshCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_KEY) || ApiClient.getToken();
  if (!token) {
    clearStoredAuth();
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
    clearStoredAuth();
    ApiClient.clearToken();
  }

  return null;
}

export function logoutUser(): void {
  clearStoredAuth();
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
