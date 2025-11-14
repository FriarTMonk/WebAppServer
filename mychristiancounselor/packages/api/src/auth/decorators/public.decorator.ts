import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator to mark routes that should bypass JWT authentication.
 * Use this on endpoints like login, register, and refresh that don't require authentication.
 *
 * @example
 * ```typescript
 * @Public()
 * @Post('login')
 * async login(@Body() dto: LoginDto) {
 *   return this.authService.login(dto);
 * }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
