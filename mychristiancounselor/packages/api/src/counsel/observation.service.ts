import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';

@Injectable()
export class ObservationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new counselor observation
   * Only assigned counselor can create observations (NOT coverage counselors)
   */
  async createObservation(
    counselorId: string,
    memberId: string,
    organizationId: string,
    dto: CreateObservationDto,
  ) {
    // Verify counselor is assigned to member (NOT coverage)
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Only assigned counselors can create observations');
    }

    return this.prisma.counselorObservation.create({
      data: {
        counselorId,
        memberId,
        content: dto.content,
      },
    });
  }

  /**
   * Get all observations for a member
   * Only assigned counselor can view (NOT coverage counselors)
   */
  async getObservationsForMember(
    counselorId: string,
    memberId: string,
    organizationId: string,
  ) {
    // Verify counselor is assigned to member
    const assignment = await this.prisma.counselorAssignment.findFirst({
      where: {
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      },
    });

    if (!assignment) {
      throw new ForbiddenException('Only assigned counselors can view observations');
    }

    return this.prisma.counselorObservation.findMany({
      where: { counselorId, memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an observation
   * Only the authoring counselor can update
   */
  async updateObservation(
    counselorId: string,
    observationId: string,
    dto: UpdateObservationDto,
  ) {
    const observation = await this.prisma.counselorObservation.findUnique({
      where: { id: observationId },
    });

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    if (observation.counselorId !== counselorId) {
      throw new ForbiddenException('Only the authoring counselor can update this observation');
    }

    return this.prisma.counselorObservation.update({
      where: { id: observationId },
      data: { content: dto.content },
    });
  }

  /**
   * Delete an observation
   * Only the authoring counselor can delete
   */
  async deleteObservation(counselorId: string, observationId: string) {
    const observation = await this.prisma.counselorObservation.findUnique({
      where: { id: observationId },
    });

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    if (observation.counselorId !== counselorId) {
      throw new ForbiddenException('Only the authoring counselor can delete this observation');
    }

    await this.prisma.counselorObservation.delete({
      where: { id: observationId },
    });

    return { success: true };
  }
}
