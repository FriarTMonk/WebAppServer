import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new holiday
   */
  async create(dto: CreateHolidayDto, userId: string) {
    const holiday = await this.prisma.holiday.create({
      data: {
        ...dto,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Holiday created: ${holiday.name} on ${holiday.date}`);

    return holiday;
  }

  /**
   * Get all holidays
   */
  async findAll() {
    return this.prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get a single holiday
   */
  async findOne(id: string) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return holiday;
  }

  /**
   * Update a holiday
   */
  async update(id: string, dto: UpdateHolidayDto) {
    const holiday = await this.findOne(id); // Verifies it exists

    const updated = await this.prisma.holiday.update({
      where: { id },
      data: dto,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(`Holiday updated: ${updated.name}`);

    return updated;
  }

  /**
   * Delete a holiday
   */
  async remove(id: string) {
    const holiday = await this.findOne(id); // Verifies it exists

    await this.prisma.holiday.delete({
      where: { id },
    });

    this.logger.log(`Holiday deleted: ${holiday.name}`);

    return { message: 'Holiday deleted successfully' };
  }
}
