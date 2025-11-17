import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that verifies the user has a Counselor role in any organization
 */
@Injectable()
export class IsCounselorGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has Counselor role in any organization
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        role: true,
      },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('User is not a member of any organization');
    }

    const isCounselor = memberships.some(m =>
      m.role.name.includes('Counselor')
    );

    if (!isCounselor) {
      throw new ForbiddenException('User does not have Counselor role');
    }

    return true;
  }
}
