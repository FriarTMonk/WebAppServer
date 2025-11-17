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

    // If user is in a morph session, check the original admin's permissions
    // This allows morphed admins to end their session and perform admin operations
    const userIdToCheck = user.isMorphed && user.originalAdminId
      ? user.originalAdminId
      : user.id;

    // Check if user (or original admin if morphed) has isPlatformAdmin flag
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userIdToCheck },
      select: { isPlatformAdmin: true },
    });

    if (!dbUser || !dbUser.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }
}
