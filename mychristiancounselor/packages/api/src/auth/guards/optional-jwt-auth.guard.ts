import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw an error if no user is found
  handleRequest(err: any, user: any) {
    // If there's a user, return it; otherwise return null (no error thrown)
    return user || null;
  }

  // Override canActivate to always return true
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Call parent's canActivate to process the token if present
    try {
      await super.canActivate(context);
    } catch (err) {
      // Ignore authentication errors - we want optional auth
    }
    // Always allow the request to proceed
    return true;
  }
}
