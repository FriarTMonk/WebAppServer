import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IsSalesRepGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // If user is in a morph session, check the original admin's permissions
    const userIdToCheck = user.isMorphed && user.originalAdminId
      ? user.originalAdminId
      : user.id;

    // Check if user (or original admin if morphed) has isSalesRep or isPlatformAdmin flag
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userIdToCheck },
      select: { isSalesRep: true, isPlatformAdmin: true },
    });

    // Allow both sales reps and platform admins
    if (!dbUser || (!dbUser.isSalesRep && !dbUser.isPlatformAdmin)) {
      throw new ForbiddenException('Sales rep or platform admin access required');
    }

    return true;
  }
}
