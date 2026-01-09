import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateFrameworkDto {
  version: string;
  criteria: any;
  categoryWeights: any;
  thresholds: { notAligned: number; globallyAligned: number };
}

@Injectable()
export class EvaluationFrameworkService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.evaluationFramework.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActive() {
    return this.prisma.evaluationFramework.findFirst({
      where: { isActive: true },
    });
  }

  async create(userId: string, dto: CreateFrameworkDto) {
    // Validate thresholds
    if (dto.thresholds.notAligned >= dto.thresholds.globallyAligned) {
      throw new BadRequestException('notAligned threshold must be less than globallyAligned');
    }

    // Check for duplicate version
    const existing = await this.prisma.evaluationFramework.findUnique({
      where: { version: dto.version },
    });

    if (existing) {
      throw new BadRequestException(`Framework version ${dto.version} already exists`);
    }

    return this.prisma.evaluationFramework.create({
      data: {
        version: dto.version,
        criteria: dto.criteria,
        categoryWeights: dto.categoryWeights,
        thresholds: dto.thresholds,
        createdBy: userId,
      },
    });
  }

  async activate(userId: string, id: string) {
    const framework = await this.prisma.evaluationFramework.findUnique({
      where: { id },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    // Deactivate all others, activate this one
    await this.prisma.$transaction([
      this.prisma.evaluationFramework.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.evaluationFramework.update({
        where: { id },
        data: { isActive: true, activatedAt: new Date() },
      }),
    ]);

    return this.getActive();
  }
}
