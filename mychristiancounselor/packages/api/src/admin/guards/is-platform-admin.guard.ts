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

    // Check if user has isPlatformAdmin flag
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isPlatformAdmin: true },
    });

    if (!dbUser || !dbUser.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }

    return true;
  }
}
