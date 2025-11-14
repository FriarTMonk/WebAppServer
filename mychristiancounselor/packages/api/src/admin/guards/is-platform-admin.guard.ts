import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IsPlatformAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is member of Platform Admin organization
    const platformAdminMembership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organization: {
          isSystemOrganization: true,
        },
      },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!platformAdminMembership) {
      throw new ForbiddenException('Platform admin access required');
    }

    // Attach platform admin info to request
    request.platformAdmin = {
      organizationId: platformAdminMembership.organizationId,
      roleId: platformAdminMembership.roleId,
      permissions: platformAdminMembership.role.permissions,
    };

    return true;
  }
}
