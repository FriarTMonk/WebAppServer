import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsPlatformAdminGuard } from './is-platform-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('IsPlatformAdminGuard', () => {
  let guard: IsPlatformAdminGuard;
  let prismaService: any;

  beforeEach(() => {
    prismaService = {
      organizationMember: {
        findFirst: jest.fn(),
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
    (prismaService.organizationMember.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should return true if user is platform admin', async () => {
    const context = createMockExecutionContext({ id: 'admin-123', email: 'admin@test.com' });
    (prismaService.organizationMember.findFirst as jest.Mock).mockResolvedValue({
      id: 'membership-123',
      userId: 'admin-123',
      organizationId: 'platform-admin-org',
      roleId: 'admin-role',
      organization: { id: 'platform-admin-org', isSystemOrganization: true } as any,
      role: { id: 'admin-role', permissions: ['platform_admin'] } as any,
    } as any);

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
