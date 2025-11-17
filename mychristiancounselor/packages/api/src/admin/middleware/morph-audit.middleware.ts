import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../admin.service';

/**
 * Middleware to automatically log all actions taken during a morph session.
 *
 * This middleware:
 * - Checks if the current request is from a morphed admin
 * - Logs the action with morph session metadata
 * - Runs after the request completes successfully
 */
@Injectable()
export class MorphAuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MorphAuditMiddleware.name);

  constructor(private adminService: AdminService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    // Only log if user is morphed
    if (!user || !user.isMorphed || !user.originalAdminId || !user.morphSessionId) {
      return next();
    }

    // Store original send to intercept response
    const originalSend = res.send;
    const originalJson = res.json;

    // Capture when response is sent
    const logAction = async (statusCode: number) => {
      try {
        // Don't log OPTIONS requests or static assets
        if (req.method === 'OPTIONS') {
          return;
        }

        // Build action name from method and path
        const action = `morphed_${req.method.toLowerCase()}_${this.sanitizePath(req.path)}`;

        // Build metadata
        const metadata: Record<string, any> = {
          method: req.method,
          path: req.path,
          statusCode,
          morphedAs: user.id,
          originalAdminId: user.originalAdminId,
          timestamp: new Date(),
        };

        // Include query params if present
        if (Object.keys(req.query).length > 0) {
          metadata.queryParams = req.query;
        }

        // Include body for write operations (but sanitize sensitive data)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          metadata.body = this.sanitizeBody(req.body);
        }

        // Log the action
        await this.adminService.logAdminAction(
          user.originalAdminId,
          action,
          metadata,
          user.id, // targetUserId is the morphed user
          undefined,
          user.morphSessionId,
        );
      } catch (error) {
        this.logger.error('Failed to log morphed action', error);
        // Don't throw - audit logging failure shouldn't break the request
      }
    };

    // Override res.send
    res.send = function (data: any) {
      logAction(res.statusCode);
      return originalSend.call(this, data);
    };

    // Override res.json
    res.json = function (data: any) {
      logAction(res.statusCode);
      return originalJson.call(this, data);
    };

    next();
  }

  /**
   * Sanitize path for action name
   * Removes IDs and special characters to create consistent action names
   */
  private sanitizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
      .replace(/\/[0-9]+/g, '/:id') // Numeric IDs
      .replace(/[^a-z0-9_]/gi, '_') // Replace special chars
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Trim underscores
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'token', 'secret', 'apiKey'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
