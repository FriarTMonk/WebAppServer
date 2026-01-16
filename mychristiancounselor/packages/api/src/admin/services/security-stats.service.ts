import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SecurityStatsService {
  constructor(private prisma: PrismaService) {}

  async get2FAStats() {
    const [total, enabled, emailMethod, totpMethod] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { twoFactorEnabled: true } }),
      this.prisma.user.count({ where: { twoFactorMethod: 'email' } }),
      this.prisma.user.count({ where: { twoFactorMethod: 'totp' } }),
    ]);

    return {
      total,
      enabled,
      disabled: total - enabled,
      emailMethod,
      totpMethod,
      enabledPercentage: total > 0 ? Math.round((enabled / total) * 100) : 0,
    };
  }

  async get2FAUserList(filters?: { method?: string; enabled?: boolean }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.enabled !== undefined && { twoFactorEnabled: filters.enabled }),
        ...(filters?.method && { twoFactorMethod: filters.method }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorEnabledAt: true,
      },
      orderBy: { twoFactorEnabledAt: 'desc' },
    });
  }
}
