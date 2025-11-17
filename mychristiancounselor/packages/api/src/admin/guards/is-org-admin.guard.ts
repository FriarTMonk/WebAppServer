import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard to check if a user is an admin (Owner or Admin role) of any organization.
 * This is used for /org-admin routes where the user manages their own organization.
 *
 * For organization-specific operations, you may want to verify they have admin access
 * to the specific organization being accessed.
 */
@Injectable()
export class IsOrgAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // For org admin guard, always check the current user (morphed or not)
    // This allows platform admins to morph into org admins and access their permissions
    // Check if user has Admin or Owner role in any organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: {
          OR: [
            { name: 'Owner' },
            { name: 'Admin' },
          ],
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isSystemOrganization: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Organization admin access required');
    }

    // Attach organization info to request for use in controllers
    request.userOrganization = {
      id: membership.organization.id,
      name: membership.organization.name,
      isSystemOrganization: membership.organization.isSystemOrganization,
    };

    return true;
  }
}
