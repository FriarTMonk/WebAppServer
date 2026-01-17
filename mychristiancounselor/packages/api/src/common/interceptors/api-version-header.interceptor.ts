import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Adds API version headers to all responses
 *
 * Headers added:
 * - X-API-Version: 1 (current version)
 * - X-API-Deprecated: true (if deprecated, not used yet)
 * - X-API-Sunset: YYYY-MM-DD (if deprecated, not used yet)
 */
@Injectable()
export class ApiVersionHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // Add current version header
    response.setHeader('X-API-Version', '1');

    // TODO: When v2 is released and v1 deprecated, add:
    // response.setHeader('X-API-Deprecated', 'true');
    // response.setHeader('X-API-Sunset', '2027-06-01');

    return next.handle();
  }
}
