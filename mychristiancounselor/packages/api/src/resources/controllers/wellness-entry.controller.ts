import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WellnessEntryService, CreateWellnessEntryDto, UpdateWellnessEntryDto } from '../services/wellness-entry.service';

@Controller('resources/wellness-entries')
@UseGuards(JwtAuthGuard)
export class WellnessEntryController {
  constructor(private wellnessEntry: WellnessEntryService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWellnessEntryDto,
  ) {
    return this.wellnessEntry.create(userId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.wellnessEntry.findAll(userId, startDate, endDate);
  }

  @Get(':date')
  async findByDate(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
  ) {
    const entry = await this.wellnessEntry.findByDate(userId, date);
    if (!entry) {
      throw new NotFoundException('No wellness entry found for this date');
    }
    return entry;
  }

  @Put(':date')
  async update(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
    @Body() dto: UpdateWellnessEntryDto,
  ) {
    return this.wellnessEntry.update(userId, date, dto);
  }

  @Delete(':date')
  async delete(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
  ) {
    return this.wellnessEntry.delete(userId, date);
  }
}
