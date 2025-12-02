import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsPlatformAdminGuard } from './is-platform-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('IsPlatformAdminGuard', () => {
  let guard: IsPlatformAdminGuard;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    guard = new IsPlatformAdminGuard(prismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException if user not authenticated', async () => {
    const context = createMockExecutionContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not platform admin', async () => {
    const context = createMockExecutionContext({ id: 'user-123', email: 'user@test.com' });
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      isPlatformAdmin: false,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if user is platform admin', async () => {
    const context = createMockExecutionContext({ id: 'admin-123', email: 'admin@test.com' });
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      isPlatformAdmin: true,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }
});
