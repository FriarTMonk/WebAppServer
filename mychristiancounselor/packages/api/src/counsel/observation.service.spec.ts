import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ObservationService } from './observation.service';
import {
  createPrismaMock,
  createAssignmentFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';

describe('ObservationService', () => {
  let service: ObservationService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObservationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ObservationService>(ObservationService);
  });

  // ============================================================================
  // CREATE OBSERVATION
  // ============================================================================

  describe('createObservation', () => {
    const counselorId = 'counselor-1';
    const memberId = 'member-1';
    const organizationId = 'org-1';
    const dto = { content: 'Member is making good progress with their faith journey' };

    it('should create observation when counselor is assigned', async () => {
      const assignment = createAssignmentFixture({
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      });

      const createdObservation = {
        id: 'obs-1',
        counselorId,
        memberId,
        content: dto.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.create = jest.fn().mockResolvedValue(createdObservation);

      const result = await service.createObservation(counselorId, memberId, organizationId, dto);

      expect(result).toEqual(createdObservation);
      expect(prismaMock.counselorObservation!.create).toHaveBeenCalledWith({
        data: {
          counselorId,
          memberId,
          content: dto.content,
        },
      });
    });

    it('should throw when counselor is not assigned to member', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createObservation(counselorId, memberId, organizationId, dto),
        ForbiddenException,
        'Only assigned counselors can access observations'
      );

      expect(prismaMock.counselorObservation!.create).not.toHaveBeenCalled();
    });

    it('should throw when assignment is inactive', async () => {
      const inactiveAssignment = createAssignmentFixture({
        counselorId,
        memberId,
        organizationId,
        status: 'inactive',
      });

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createObservation(counselorId, memberId, organizationId, dto),
        ForbiddenException,
        'Only assigned counselors can access observations'
      );
    });

    it('should verify assignment before creating observation', async () => {
      const assignment = createAssignmentFixture({
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      });

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.create = jest.fn().mockResolvedValue({});

      await service.createObservation(counselorId, memberId, organizationId, dto);

      expect(prismaMock.counselorAssignment!.findFirst).toHaveBeenCalledWith({
        where: {
          counselorId,
          memberId,
          organizationId,
          status: 'active',
        },
      });
    });
  });

  // ============================================================================
  // GET OBSERVATIONS FOR MEMBER
  // ============================================================================

  describe('getObservationsForMember', () => {
    const counselorId = 'counselor-1';
    const memberId = 'member-1';
    const organizationId = 'org-1';

    it('should return observations when counselor is assigned', async () => {
      const assignment = createAssignmentFixture({
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      });

      const observations = [
        {
          id: 'obs-1',
          counselorId,
          memberId,
          content: 'First observation',
          createdAt: new Date('2025-01-02'),
          deletedAt: null,
        },
        {
          id: 'obs-2',
          counselorId,
          memberId,
          content: 'Second observation',
          createdAt: new Date('2025-01-01'),
          deletedAt: null,
        },
      ];

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue(observations);

      const result = await service.getObservationsForMember(counselorId, memberId, organizationId);

      expect(result).toEqual(observations);
      expect(result).toHaveLength(2);
    });

    it('should throw when counselor is not assigned to member', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.getObservationsForMember(counselorId, memberId, organizationId),
        ForbiddenException,
        'Only assigned counselors can access observations'
      );
    });

    it('should exclude deleted observations', async () => {
      const assignment = createAssignmentFixture({ counselorId, memberId, organizationId });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);

      await service.getObservationsForMember(counselorId, memberId, organizationId);

      expect(prismaMock.counselorObservation!.findMany).toHaveBeenCalledWith({
        where: {
          counselorId,
          memberId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return observations ordered by creation date descending', async () => {
      const assignment = createAssignmentFixture({ counselorId, memberId, organizationId });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);

      await service.getObservationsForMember(counselorId, memberId, organizationId);

      expect(prismaMock.counselorObservation!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should return empty array when no observations exist', async () => {
      const assignment = createAssignmentFixture({ counselorId, memberId, organizationId });
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getObservationsForMember(counselorId, memberId, organizationId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // UPDATE OBSERVATION
  // ============================================================================

  describe('updateObservation', () => {
    const counselorId = 'counselor-1';
    const observationId = 'obs-1';
    const dto = { content: 'Updated observation content' };

    it('should update observation when counselor is the author', async () => {
      const observation = {
        id: observationId,
        counselorId,
        memberId: 'member-1',
        content: 'Original content',
        createdAt: new Date(),
        deletedAt: null,
      };

      const updatedObservation = {
        ...observation,
        content: dto.content,
        updatedAt: new Date(),
      };

      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(observation);
      prismaMock.counselorObservation!.update = jest.fn().mockResolvedValue(updatedObservation);

      const result = await service.updateObservation(counselorId, observationId, dto);

      expect(result).toEqual(updatedObservation);
      expect(prismaMock.counselorObservation!.update).toHaveBeenCalledWith({
        where: { id: observationId },
        data: { content: dto.content },
      });
    });

    it('should throw when observation does not exist', async () => {
      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.updateObservation(counselorId, 'non-existent', dto),
        NotFoundException,
        'Observation not found'
      );
    });

    it('should throw when counselor is not the author', async () => {
      const observation = {
        id: observationId,
        counselorId: 'other-counselor',
        memberId: 'member-1',
        content: 'Original content',
      };

      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(observation);

      await expectToThrow(
        () => service.updateObservation(counselorId, observationId, dto),
        ForbiddenException,
        'Only the authoring counselor can update this observation'
      );

      expect(prismaMock.counselorObservation!.update).not.toHaveBeenCalled();
    });

    it('should verify ownership before updating', async () => {
      const observation = {
        id: observationId,
        counselorId,
        memberId: 'member-1',
        content: 'Original',
      };

      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(observation);
      prismaMock.counselorObservation!.update = jest.fn().mockResolvedValue(observation);

      await service.updateObservation(counselorId, observationId, dto);

      expect(prismaMock.counselorObservation!.findUnique).toHaveBeenCalledWith({
        where: { id: observationId },
      });
    });
  });

  // ============================================================================
  // DELETE OBSERVATION
  // ============================================================================

  describe('deleteObservation', () => {
    const counselorId = 'counselor-1';
    const observationId = 'obs-1';

    it('should delete observation when counselor is the author', async () => {
      const observation = {
        id: observationId,
        counselorId,
        memberId: 'member-1',
        content: 'Original content',
        deletedAt: null,
      };

      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(observation);
      prismaMock.counselorObservation!.update = jest.fn().mockResolvedValue({
        ...observation,
        deletedAt: new Date(),
      });

      const result = await service.deleteObservation(counselorId, observationId);

      expect(result).toEqual({ success: true });
      expect(prismaMock.counselorObservation!.update).toHaveBeenCalledWith({
        where: { id: observationId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw when observation does not exist', async () => {
      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.deleteObservation(counselorId, 'non-existent'),
        NotFoundException,
        'Observation not found'
      );
    });

    it('should throw when counselor is not the author', async () => {
      const observation = {
        id: observationId,
        counselorId: 'other-counselor',
        memberId: 'member-1',
        content: 'Original content',
      };

      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(observation);

      await expectToThrow(
        () => service.deleteObservation(counselorId, observationId),
        ForbiddenException,
        'Only the authoring counselor can delete this observation'
      );

      expect(prismaMock.counselorObservation!.update).not.toHaveBeenCalled();
    });

    it('should soft delete observation using deletedAt timestamp', async () => {
      const observation = {
        id: observationId,
        counselorId,
        memberId: 'member-1',
        content: 'Content',
      };

      prismaMock.counselorObservation!.findUnique = jest.fn().mockResolvedValue(observation);
      prismaMock.counselorObservation!.update = jest.fn().mockResolvedValue(observation);

      await service.deleteObservation(counselorId, observationId);

      expect(prismaMock.counselorObservation!.update).toHaveBeenCalledWith({
        where: { id: observationId },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
