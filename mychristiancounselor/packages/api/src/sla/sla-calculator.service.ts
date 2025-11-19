import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  addHours,
  addMinutes,
  differenceInMinutes,
  getDay,
  getHours,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { SLA_TARGETS, BUSINESS_HOURS, SLA_THRESHOLDS } from './constants';

export type SLAStatus = 'on_track' | 'approaching' | 'critical' | 'breached';
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'feature';

interface Holiday {
  id: string;
  date: Date;
  name: string;
  isRecurring: boolean;
}

@Injectable()
export class SlaCalculatorService {
  private readonly logger = new Logger(SlaCalculatorService.name);
  private holidayCache: Holiday[] = [];
  private holidayCacheExpiry: Date = new Date(0);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate SLA deadline from a start time
   */
  async calculateDeadline(
    startTime: Date,
    slaHours: number,
  ): Promise<Date | null> {
    if (slaHours === null || slaHours === undefined) {
      return null; // No SLA for this priority level
    }

    const holidays = await this.getHolidays();

    // Convert start time to business timezone
    const startInTz = toZonedTime(startTime, BUSINESS_HOURS.timezone);

    // Add business hours to get deadline
    const deadline = this.addBusinessHours(startInTz, slaHours, holidays);

    // Convert back to UTC for storage
    return fromZonedTime(deadline, BUSINESS_HOURS.timezone);
  }

  /**
   * Add business hours to a date
   */
  private addBusinessHours(
    start: Date,
    hoursToAdd: number,
    holidays: Holiday[],
  ): Date {
    let current = new Date(start);
    let hoursAdded = 0;

    // If start time is outside business hours, advance to next business hour
    current = this.advanceToNextBusinessHour(current, holidays);

    // Add hours one at a time
    while (hoursAdded < hoursToAdd) {
      if (this.isBusinessHour(current, holidays)) {
        hoursAdded++;
        current = addHours(current, 1);
      } else {
        // Advance to next business hour
        current = this.advanceToNextBusinessHour(current, holidays);
      }
    }

    return current;
  }

  /**
   * Check if a given time is within business hours
   */
  private isBusinessHour(date: Date, holidays: Holiday[]): boolean {
    // Check if weekend
    const dayOfWeek = getDay(date);
    if (!BUSINESS_HOURS.weekdays.includes(dayOfWeek)) {
      return false;
    }

    // Check if holiday
    if (this.isHoliday(date, holidays)) {
      return false;
    }

    // Check if within business hours (10 AM - 10 PM)
    const hour = getHours(date);
    return hour >= BUSINESS_HOURS.startHour && hour < BUSINESS_HOURS.endHour;
  }

  /**
   * Check if a date is a holiday
   */
  private isHoliday(date: Date, holidays: Holiday[]): boolean {
    const dateStart = startOfDay(date);

    return holidays.some((holiday) => {
      const holidayDate = startOfDay(holiday.date);

      if (holiday.isRecurring) {
        // For recurring holidays, check month and day only
        return (
          holidayDate.getMonth() === dateStart.getMonth() &&
          holidayDate.getDate() === dateStart.getDate()
        );
      } else {
        // For non-recurring, check exact date
        return isSameDay(holidayDate, dateStart);
      }
    });
  }

  /**
   * Advance to the next business hour
   */
  private advanceToNextBusinessHour(
    current: Date,
    holidays: Holiday[],
  ): Date {
    let next = new Date(current);

    // If currently in business hours, return as-is
    if (this.isBusinessHour(next, holidays)) {
      return next;
    }

    // If after business hours today, advance to next day 10 AM
    const hour = getHours(next);
    if (hour >= BUSINESS_HOURS.endHour || hour < BUSINESS_HOURS.startHour) {
      // Set to next day at start hour
      next = addHours(startOfDay(next), 24 + BUSINESS_HOURS.startHour);
    }

    // Keep advancing by day until we hit a business day
    while (!this.isBusinessHour(next, holidays)) {
      next = addHours(next, 24);
      next = startOfDay(next);
      next = addHours(next, BUSINESS_HOURS.startHour);
    }

    return next;
  }

  /**
   * Calculate business minutes between two dates
   */
  async calculateBusinessMinutes(start: Date, end: Date): Promise<number> {
    const holidays = await this.getHolidays(); // Ensure holidays are loaded
    let minutes = 0;
    let current = new Date(start);

    // Convert to business timezone
    const startInTz = toZonedTime(current, BUSINESS_HOURS.timezone);
    const endInTz = toZonedTime(end, BUSINESS_HOURS.timezone);

    current = new Date(startInTz);
    const endTime = new Date(endInTz);

    // For multi-day spans, count by days first for performance
    while (differenceInMinutes(endTime, current) > 60 * 24) {
      // Count minutes for this entire day if it's a business day
      const dayStart = new Date(current);
      const dayEnd = addHours(startOfDay(current), BUSINESS_HOURS.endHour);

      // Skip to next business day if not in business hours
      if (!this.isBusinessHour(current, holidays)) {
        current = this.advanceToNextBusinessHour(current, holidays);
        continue;
      }

      // Count business hours for this day (12 hours * 60 minutes)
      const businessMinutesInDay = (BUSINESS_HOURS.endHour - BUSINESS_HOURS.startHour) * 60;
      minutes += businessMinutesInDay;

      // Move to next day at start hour
      current = addHours(startOfDay(current), 24 + BUSINESS_HOURS.startHour);
    }

    // Count remaining minutes minute-by-minute
    while (current < endTime) {
      if (this.isBusinessHour(current, holidays)) {
        minutes++;
      }
      current = addMinutes(current, 1);
    }

    return minutes;
  }

  /**
   * Calculate current SLA status
   */
  async calculateSLAStatus(
    createdAt: Date,
    deadline: Date | null,
    pausedMinutes: number = 0,
  ): Promise<SLAStatus> {
    if (!deadline) {
      return 'on_track'; // No SLA for this priority
    }

    const totalMinutes = await this.calculateBusinessMinutes(createdAt, deadline);
    const elapsedMinutes =
      (await this.calculateBusinessMinutes(createdAt, new Date())) - pausedMinutes;
    const percentElapsed = (elapsedMinutes / totalMinutes) * 100;

    if (percentElapsed >= SLA_THRESHOLDS.breached) return 'breached';
    if (percentElapsed >= SLA_THRESHOLDS.critical) return 'critical';
    if (percentElapsed >= SLA_THRESHOLDS.approaching) return 'approaching';
    return 'on_track';
  }

  /**
   * Get SLA hours for a priority level
   */
  getSLAHours(priority: Priority, type: 'response' | 'resolution'): number | null {
    const target = SLA_TARGETS[priority];
    if (!target) {
      this.logger.warn(`Unknown priority: ${priority}, defaulting to medium`);
      return SLA_TARGETS.medium[type];
    }
    return target[type];
  }

  /**
   * Pause SLA for a ticket
   */
  async pauseSLA(ticketId: string, reason: string, tx?: any): Promise<void> {
    const client = tx || this.prisma;

    await client.supportTicket.update({
      where: { id: ticketId },
      data: {
        slaPausedAt: new Date(),
        slaPausedReason: reason,
      },
    });

    this.logger.log(`SLA paused for ticket ${ticketId}: ${reason}`);
  }

  /**
   * Resume SLA for a ticket
   */
  async resumeSLA(ticketId: string, tx?: any): Promise<void> {
    const client = tx || this.prisma;

    const ticket = await client.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || !ticket.slaPausedAt) {
      return; // Nothing to resume
    }

    // Calculate pause duration in business minutes
    const pauseDuration = await this.calculateBusinessMinutes(
      ticket.slaPausedAt,
      new Date(),
    );

    // Extend deadlines by pause duration
    const newResponseDeadline = ticket.responseSLADeadline
      ? addMinutes(ticket.responseSLADeadline, pauseDuration)
      : null;

    const newResolutionDeadline = ticket.resolutionSLADeadline
      ? addMinutes(ticket.resolutionSLADeadline, pauseDuration)
      : null;

    await client.supportTicket.update({
      where: { id: ticketId },
      data: {
        responseSLADeadline: newResponseDeadline,
        resolutionSLADeadline: newResolutionDeadline,
        slaPausedAt: null,
        slaPausedReason: null,
      },
    });

    this.logger.log(
      `SLA resumed for ticket ${ticketId}, extended by ${pauseDuration} minutes`,
    );
  }

  /**
   * Get holidays with caching
   */
  private async getHolidays(): Promise<Holiday[]> {
    // Refresh cache if expired (24 hours)
    if (new Date() > this.holidayCacheExpiry) {
      this.holidayCache = await this.prisma.holiday.findMany({
        orderBy: { date: 'asc' },
      });

      // Set cache expiry to 24 hours from now
      this.holidayCacheExpiry = addHours(new Date(), 24);

      this.logger.debug(`Holiday cache refreshed: ${this.holidayCache.length} holidays loaded`);
    }

    return this.holidayCache;
  }
}
