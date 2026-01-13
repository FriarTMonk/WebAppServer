import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateWellnessEntryDto {
  date: string;
  moodRating?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
  notes?: string;
}

export interface UpdateWellnessEntryDto {
  moodRating?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
  notes?: string;
}

@Injectable()
export class WellnessEntryService {
  private readonly logger = new Logger(WellnessEntryService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWellnessEntryDto) {
    this.logger.log(`Creating wellness entry for user ${userId} on ${dto.date}`);

    // Validate input ranges
    if (dto.moodRating !== undefined && (dto.moodRating < 1 || dto.moodRating > 10)) {
      throw new BadRequestException('Mood rating must be between 1 and 10');
    }
    if (dto.sleepHours !== undefined && (dto.sleepHours < 0 || dto.sleepHours > 24)) {
      throw new BadRequestException('Sleep hours must be between 0 and 24');
    }
    if (dto.exerciseMinutes !== undefined && (dto.exerciseMinutes < 0 || dto.exerciseMinutes > 1440)) {
      throw new BadRequestException('Exercise minutes must be between 0 and 1440');
    }

    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0); // Normalize to start of day

    return this.prisma.wellnessEntry.create({
      data: {
        userId,
        date,
        moodRating: dto.moodRating,
        sleepHours: dto.sleepHours,
        exerciseMinutes: dto.exerciseMinutes,
        notes: dto.notes,
      },
    });
  }

  async findByDate(userId: string, date: string) {
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    return this.prisma.wellnessEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: searchDate,
        },
      },
    });
  }

  async findAll(userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date = { ...where.date, gte: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { ...where.date, lte: end };
    }

    return this.prisma.wellnessEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async update(userId: string, date: string, dto: UpdateWellnessEntryDto) {
    // Validate input ranges
    if (dto.moodRating !== undefined && (dto.moodRating < 1 || dto.moodRating > 10)) {
      throw new BadRequestException('Mood rating must be between 1 and 10');
    }
    if (dto.sleepHours !== undefined && (dto.sleepHours < 0 || dto.sleepHours > 24)) {
      throw new BadRequestException('Sleep hours must be between 0 and 24');
    }
    if (dto.exerciseMinutes !== undefined && (dto.exerciseMinutes < 0 || dto.exerciseMinutes > 1440)) {
      throw new BadRequestException('Exercise minutes must be between 0 and 1440');
    }

    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    try {
      return await this.prisma.wellnessEntry.update({
        where: {
          userId_date: {
            userId,
            date: searchDate,
          },
        },
        data: dto,
      });
    } catch (error) {
      throw new NotFoundException('Wellness entry not found');
    }
  }

  async delete(userId: string, date: string) {
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    try {
      await this.prisma.wellnessEntry.delete({
        where: {
          userId_date: {
            userId,
            date: searchDate,
          },
        },
      });
      return { success: true };
    } catch (error) {
      throw new NotFoundException('Wellness entry not found');
    }
  }
}
