import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * CSRF Protection Guard
 *
 * Unix Principles Applied:
 * - Do one thing well: Validate request origin
 * - Fail safely: Block suspicious requests
 * - Clear and simple: Origin/Referer check
 *
 * How it works:
 * 1. GET/HEAD/OPTIONS requests: Always allowed (safe methods)
 * 2. POST/PUT/DELETE/PATCH: Validates Origin or Referer header
 * 3. Public endpoints: Can bypass with @Public() decorator
 *
 * Protection Level:
 * - Prevents cross-origin requests from malicious sites
 * - Works with JWT in localStorage or httpOnly cookies
 * - Defense in depth even though JWT + localStorage is safer
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  // Safe HTTP methods that don't need CSRF protection
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Allow safe HTTP methods (idempotent, read-only)
    if (this.SAFE_METHODS.includes(method)) {
      return true;
    }

    // Check if endpoint is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Validate origin for state-changing requests
    const isValidOrigin = this.validateOrigin(request);

    if (!isValidOrigin) {
      this.logger.warn(
        `CSRF protection blocked request: ${method} ${request.url} from origin: ${request.headers.origin || request.headers.referer || 'unknown'}`
      );

      throw new ForbiddenException(
        'Request origin validation failed. This request appears to be coming from an unauthorized source.'
      );
    }

    return true;
  }

  /**
   * Validate request origin matches allowed domains
   * Unix principle: Simple validation, clear logic
   */
  private validateOrigin(request: Request): boolean {
    // Get allowed origins from CORS configuration
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3699'];

    // Get origin from request (set by browser on cross-origin requests)
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    // For same-origin requests, origin header may be undefined
    // This is OK - same-origin requests are safe
    if (!origin && !referer) {
      // If both are missing, it might be:
      // 1. Same-origin request (safe)
      // 2. Direct API call (e.g., curl, Postman) - we allow for development
      // 3. Malicious request (rare, but possible)

      // In development, allow missing origin/referer
      if (process.env.NODE_ENV === 'development') {
        return true;
      }

      // In production, require at least one
      this.logger.warn('Missing both Origin and Referer headers in production');
      return false;
    }

    // Check Origin header (most reliable)
    if (origin && this.isAllowedOrigin(origin, allowedOrigins)) {
      return true;
    }

    // Fallback to Referer header (less reliable, can be spoofed)
    if (referer && this.isAllowedReferer(referer, allowedOrigins)) {
      return true;
    }

    return false;
  }

  /**
   * Check if origin matches allowed list
   */
  private isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
    // Exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Check with and without trailing slash
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    return allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
      return normalizedOrigin === normalizedAllowed;
    });
  }

  /**
   * Check if referer starts with allowed origin
   */
  private isAllowedReferer(referer: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
      return referer.startsWith(normalizedAllowed);
    });
  }
}
