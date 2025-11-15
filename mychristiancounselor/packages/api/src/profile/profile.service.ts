import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        emailVerified: true,
        isActive: true,
        isPlatformAdmin: true,
        preferredTranslation: true,
        comparisonTranslations: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        preferredTranslation: true,
        comparisonTranslations: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            licenseStatus: true,
          },
        },
        role: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    return memberships.map(m => ({
      organization: m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async getHistory(
    userId: string,
    searchQuery?: string,
    topics?: string[],
    dateFrom?: Date,
    dateTo?: Date,
    status: 'active' | 'completed' = 'active',
  ) {
    // Build where clause
    const where: any = {
      userId,
      status,
    };

    // Add date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Fetch sessions
    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 2, // Only first 2 messages for excerpt
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Client-side filtering for search and topics (PostgreSQL full-text would be better)
    let filtered = sessions;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerQuery) ||
          s.messages.some((m) => m.content.toLowerCase().includes(lowerQuery))
      );
    }

    if (topics && topics.length > 0) {
      // Topics would need to be extracted/stored - placeholder for now
      // filtered = filtered.filter(s => topics.some(t => s.topics?.includes(t)));
    }

    // Format for response
    return filtered.map((session) => ({
      id: session.id,
      title: session.title,
      excerpt: session.messages[0]?.content.substring(0, 150) + '...',
      topics: [], // Would extract from messages/session metadata
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }
}
