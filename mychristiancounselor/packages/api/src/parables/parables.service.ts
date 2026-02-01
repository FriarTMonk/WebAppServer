import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParableTaskStatus } from '@prisma/client';
import { SaveParableDto, UpdateReflectionDto } from './dto/parable-metadata.dto';
import { AssignParableDto, SubmitReflectionDto } from './dto/assign-parable.dto';

@Injectable()
export class ParablesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get today's featured parable
   * Public endpoint - no auth required
   */
  async getFeaturedParable() {
    const today = new Date();

    // Try to find a featured parable published today or earlier
    const featured = await this.prisma.parable.findFirst({
      where: {
        isFeatured: true,
        publishedDate: { lte: today },
        isActive: true,
      },
      orderBy: { publishedDate: 'desc' },
    });

    if (featured) {
      return featured;
    }

    // Fallback to most recent published parable
    return this.prisma.parable.findFirst({
      where: {
        publishedDate: { lte: today },
        isActive: true,
      },
      orderBy: { publishedDate: 'desc' },
    });
  }

  /**
   * Get all parables (authenticated users only)
   */
  async getAllParables() {
    const today = new Date();

    return this.prisma.parable.findMany({
      where: {
        publishedDate: { lte: today },
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { publishedDate: 'desc' },
      ],
    });
  }

  /**
   * Get parable metadata by slug
   */
  async getParableBySlug(slug: string) {
    const parable = await this.prisma.parable.findUnique({
      where: { slug },
    });

    if (!parable) {
      throw new NotFoundException('Parable not found');
    }

    return parable;
  }

  /**
   * Get parables by category
   */
  async getParablesByCategory(category: string) {
    const today = new Date();

    return this.prisma.parable.findMany({
      where: {
        category,
        publishedDate: { lte: today },
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { publishedDate: 'desc' },
      ],
    });
  }

  /**
   * Save parable to user's reading list
   * Premium/Org users only
   */
  async saveParable(userId: string, parableId: string, dto: SaveParableDto) {
    // Check if already saved
    const existing = await this.prisma.userParableList.findUnique({
      where: {
        userId_parableId: { userId, parableId },
      },
    });

    if (existing) {
      // Update reflection notes if provided
      if (dto.reflectionNotes) {
        return this.prisma.userParableList.update({
          where: { id: existing.id },
          data: { reflectionNotes: dto.reflectionNotes },
        });
      }
      return existing;
    }

    return this.prisma.userParableList.create({
      data: {
        userId,
        parableId,
        reflectionNotes: dto.reflectionNotes,
      },
    });
  }

  /**
   * Remove parable from user's reading list
   */
  async unsaveParable(userId: string, parableId: string) {
    const existing = await this.prisma.userParableList.findUnique({
      where: {
        userId_parableId: { userId, parableId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Parable not found in reading list');
    }

    await this.prisma.userParableList.delete({
      where: { id: existing.id },
    });

    return { message: 'Parable removed from reading list' };
  }

  /**
   * Get user's saved parables
   */
  async getUserParables(userId: string) {
    return this.prisma.userParableList.findMany({
      where: { userId },
      include: {
        parable: true,
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  /**
   * Update reflection notes for a saved parable
   */
  async updateReflection(userId: string, parableId: string, dto: UpdateReflectionDto) {
    const existing = await this.prisma.userParableList.findUnique({
      where: {
        userId_parableId: { userId, parableId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Parable not found in reading list');
    }

    return this.prisma.userParableList.update({
      where: { id: existing.id },
      data: {
        reflectionNotes: dto.reflectionNotes,
        isCompleted: dto.isCompleted ?? existing.isCompleted,
        completedAt: dto.isCompleted ? new Date() : existing.completedAt,
      },
    });
  }

  /**
   * Assign parable to organization member (counselors only)
   */
  async assignParable(
    counselorId: string,
    parableId: string,
    organizationId: string,
    dto: AssignParableDto,
  ) {
    // Verify parable exists
    const parable = await this.prisma.parable.findUnique({
      where: { id: parableId },
    });

    if (!parable) {
      throw new NotFoundException('Parable not found');
    }

    // Create assignment
    return this.prisma.parableAssignment.create({
      data: {
        parableId,
        memberId: dto.memberId,
        counselorId,
        organizationId,
        counselorNotes: dto.counselorNotes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: ParableTaskStatus.assigned,
      },
      include: {
        parable: true,
        member: {
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
   * Get assignments for a member
   */
  async getMemberAssignments(memberId: string) {
    return this.prisma.parableAssignment.findMany({
      where: { memberId },
      include: {
        parable: true,
        counselor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  /**
   * Submit reflection for an assignment
   */
  async submitReflection(
    memberId: string,
    assignmentId: string,
    dto: SubmitReflectionDto,
  ) {
    const assignment = await this.prisma.parableAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.memberId !== memberId) {
      throw new ForbiddenException('Not authorized to update this assignment');
    }

    return this.prisma.parableAssignment.update({
      where: { id: assignmentId },
      data: {
        memberReflection: dto.memberReflection,
        status: ParableTaskStatus.completed,
        completedAt: new Date(),
      },
    });
  }
}
