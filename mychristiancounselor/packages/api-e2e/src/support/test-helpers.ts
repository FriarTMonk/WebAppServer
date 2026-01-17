/**
 * Get versioned API path
 * @param path - API path without version (e.g., '/auth/login')
 * @param version - API version (default: '1')
 * @returns Versioned path (e.g., '/v1/auth/login')
 */
export function getApiPath(path: string, version: string = '1'): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `/v${version}/${cleanPath}`;
}

/**
 * Get unversioned health check path
 * Health checks remain unversioned for Lightsail compatibility
 */
export function getHealthCheckPath(path: 'health' | 'health/ready' | 'health/live'): string {
  return `/${path}`;
}

// Usage examples:
// getApiPath('auth/login') → '/v1/auth/login'
// getApiPath('auth/login', '2') → '/v2/auth/login'
// getHealthCheckPath('health') → '/health' (unversioned)
