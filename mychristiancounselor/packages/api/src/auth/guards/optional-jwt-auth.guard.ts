import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to return null instead of throwing error for unauthenticated requests
  handleRequest(err: any, user: any, info: any) {
    // If there's an error or no user, just return null (anonymous user)
    if (err || !user) {
      return null;
    }
    return user;
  }

  // Always activate - authentication is optional
  canActivate(context: ExecutionContext) {
    // Call super.canActivate but catch any errors to allow anonymous access
    return super.canActivate(context) as Promise<boolean> | boolean;
  }

  async loggedIn(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
      return true;
    } catch {
      return false;
    }
  }
}
