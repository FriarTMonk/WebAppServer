import { AuthResponse, LoginDto, RegisterDto } from '@mychristiancounselor/shared';
import { apiPost } from './api';

export async function login(credentials: LoginDto): Promise<AuthResponse> {
  // Use central API utility with skipAuth (no token yet)
  const response = await apiPost('/auth/login', credentials, { skipAuth: true });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

export async function register(data: RegisterDto): Promise<AuthResponse> {
  // Use central API utility with skipAuth (no token yet)
  const response = await apiPost('/auth/register', data, { skipAuth: true });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
}

export function clearTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('morphReturnUrl'); // Clear morph session data
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697') + '/v1';
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired
      clearTokens();
      return false;
    }

    const data = await response.json();
    saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch (error) {
    console.error('[Auth] Token refresh failed:', error);
    clearTokens();
    return false;
  }
}
