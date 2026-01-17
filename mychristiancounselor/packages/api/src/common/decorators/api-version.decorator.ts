import { SetMetadata } from '@nestjs/common';

/**
 * API Version Decorator
 *
 * Marks a controller or route as belonging to a specific API version.
 * Currently all routes are v1. This decorator is for future use when v2 is needed.
 *
 * @example
 * ```typescript
 * @Controller('auth')
 * @ApiVersion('1')  // This controller is v1 only
 * export class AuthControllerV1 { }
 *
 * @Controller('auth')
 * @ApiVersion('2')  // This controller is v2 only
 * export class AuthControllerV2 { }
 * ```
 */
export const ApiVersion = (version: string) => SetMetadata('api-version', version);

/**
 * Check if route belongs to specified version
 */
export const getApiVersion = (metadata: any): string | undefined => {
  return metadata ? metadata['api-version'] : undefined;
};
