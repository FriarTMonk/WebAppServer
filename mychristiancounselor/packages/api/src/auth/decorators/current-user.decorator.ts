import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser decorator to extract the authenticated user from the request.
 * This decorator retrieves the user object that was attached to the request
 * by the JWT authentication guard/strategy.
 *
 * @example
 * ```typescript
 * @Get('me')
 * async getCurrentUser(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 *
 * Note: This decorator will be enhanced when the JWT strategy is implemented in Task 5.
 * The JWT strategy will attach the user object to request.user after validating the token.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
