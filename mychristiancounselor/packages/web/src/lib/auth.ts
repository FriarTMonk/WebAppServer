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
  }
}
