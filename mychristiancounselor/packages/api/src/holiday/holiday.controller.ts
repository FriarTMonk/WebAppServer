import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('admin/holidays')
@UseGuards(JwtAuthGuard)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  /**
   * Get all holidays
   * Accessible by all authenticated users (for viewing)
   */
  @Get()
  async findAll() {
    return this.holidayService.findAll();
  }

  /**
   * Get a single holiday
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.holidayService.findOne(id);
  }

  /**
   * Create a new holiday (platform admin only)
   */
  @Post()
  async create(@Body() dto: CreateHolidayDto, @Request() req: RequestWithUser) {
    this.ensurePlatformAdmin(req.user);
    return this.holidayService.create(dto, req.user.id);
  }

  /**
   * Update a holiday (platform admin only)
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
    @Request() req: RequestWithUser,
  ) {
    this.ensurePlatformAdmin(req.user);
    return this.holidayService.update(id, dto);
  }

  /**
   * Delete a holiday (platform admin only)
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    this.ensurePlatformAdmin(req.user);
    return this.holidayService.remove(id);
  }

  /**
   * Helper to ensure user is platform admin
   */
  private ensurePlatformAdmin(user: User) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can manage holidays',
      );
    }
  }
}
