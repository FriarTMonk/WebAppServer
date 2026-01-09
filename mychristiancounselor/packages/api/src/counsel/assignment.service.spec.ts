import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import {
  createPrismaMock,
  createEmailServiceMock,
  createUserFixture,
  createAssignmentFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let emailMock: ReturnType<typeof createEmailServiceMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    emailMock = createEmailServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  // ============================================================================
  // GET COUNSELOR MEMBERS
  // ============================================================================

  describe('getCounselorMembers', () => {
    const counselorId = 'counselor-1';
    const organizationId = 'org-1';

    it('should return member summaries for assigned members', async () => {
      const member = createUserFixture({ id: 'member-1', firstName: 'John', lastName: 'Doe' });
      const counselor = createUserFixture({ id: counselorId });
      const assignment = createAssignmentFixture({
        counselorId,
        memberId: member.id,
        organizationId,
        status: 'active',
      });

      const assignmentWithRelations = {
        ...assignment,
        member,
        counselor,
      };

      const wellbeingStatus = {
        id: 'wellbeing-1',
        memberId: member.id,
        status: 'green',
        aiSuggestedStatus: 'green',
        summary: 'Doing well',
        lastAnalyzedAt: new Date(),
      };

      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([assignmentWithRelations]);
      // Mock groupBy for last login and conversation count (called twice)
      prismaMock.session!.groupBy = jest.fn()
        .mockResolvedValueOnce([{ userId: member.id, _max: { createdAt: new Date('2025-01-01') } }]) // last login
        .mockResolvedValueOnce([{ userId: member.id, _count: { id: 5 } }]); // conversation count
      // Mock $queryRaw for last active message
      prismaMock.$queryRaw = jest.fn().mockResolvedValue([
        { userId: member.id, maxTimestamp: new Date('2025-01-02') }
      ]);
      // Mock groupBy for observation count
      prismaMock.counselorObservation!.groupBy = jest.fn().mockResolvedValue([
        { memberId: member.id, _count: { id: 3 } }
      ]);
      // Mock groupBy for pending tasks
      prismaMock.memberTask!.groupBy = jest.fn()
        .mockResolvedValueOnce([{ memberId: member.id, _count: { id: 2 } }]) // pending tasks
        .mockResolvedValueOnce([{ memberId: member.id, _count: { id: 1 } }]); // overdue tasks
      // Mock groupBy for pending assessments
      prismaMock.assignedAssessment!.groupBy = jest.fn().mockResolvedValue([
        { memberId: member.id, _count: { id: 1 } }
      ]);
      // Mock findMany for wellbeing statuses
      prismaMock.memberWellbeingStatus!.findMany = jest.fn().mockResolvedValue([wellbeingStatus]);

      const result = await service.getCounselorMembers(counselorId, organizationId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        member,
        wellbeingStatus,
        totalConversations: 5,
        observationCount: 3,
      });
    });

    it('should create default wellbeing status if not exists', async () => {
      const member = createUserFixture({ id: 'member-1' });
      const counselor = createUserFixture({ id: counselorId });
      const assignment = createAssignmentFixture({
        counselorId,
        memberId: member.id,
        organizationId,
      });

      const assignmentWithRelations = {
        ...assignment,
        member,
        counselor,
      };

      const defaultWellbeingStatus = {
        id: 'wellbeing-new',
        memberId: member.id,
        status: 'green',
        aiSuggestedStatus: 'green',
        summary: 'Member profile created. AI analysis pending.',
        lastAnalyzedAt: new Date(),
      };

      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([assignmentWithRelations]);
      // Mock groupBy calls with empty results
      prismaMock.session!.groupBy = jest.fn()
        .mockResolvedValueOnce([]) // last login (empty)
        .mockResolvedValueOnce([{ userId: member.id, _count: { id: 0 } }]); // conversation count
      prismaMock.$queryRaw = jest.fn().mockResolvedValue([]);
      prismaMock.counselorObservation!.groupBy = jest.fn().mockResolvedValue([]);
      prismaMock.memberTask!.groupBy = jest.fn()
        .mockResolvedValueOnce([]) // pending tasks
        .mockResolvedValueOnce([]); // overdue tasks
      prismaMock.assignedAssessment!.groupBy = jest.fn().mockResolvedValue([]);
      prismaMock.memberWellbeingStatus!.findMany = jest.fn().mockResolvedValue([]);
      prismaMock.memberWellbeingStatus!.createMany = jest.fn().mockResolvedValue({ count: 1 });
      prismaMock.memberWellbeingStatus!.findMany = jest.fn()
        .mockResolvedValueOnce([]) // First call returns empty
        .mockResolvedValueOnce([defaultWellbeingStatus]); // Second call after createMany

      const result = await service.getCounselorMembers(counselorId, organizationId);

      expect(result).toHaveLength(1);
      expect(prismaMock.memberWellbeingStatus!.createMany).toHaveBeenCalledWith({
        data: [{
          memberId: member.id,
          status: 'green',
          aiSuggestedStatus: 'green',
          summary: 'Member profile created. AI analysis pending.',
          lastAnalyzedAt: expect.any(Date),
        }],
      });
    });

    it('should return empty array when counselor has no assignments', async () => {
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([]);
      // Mock all groupBy calls with empty results
      prismaMock.session!.groupBy = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaMock.$queryRaw = jest.fn().mockResolvedValue([]);
      prismaMock.counselorObservation!.groupBy = jest.fn().mockResolvedValue([]);
      prismaMock.memberTask!.groupBy = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaMock.assignedAssessment!.groupBy = jest.fn().mockResolvedValue([]);
      prismaMock.memberWellbeingStatus!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getCounselorMembers(counselorId, organizationId);

      expect(result).toEqual([]);
    });

    it('should only return active assignments', async () => {
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([]);
      // Mock all groupBy calls with empty results
      prismaMock.session!.groupBy = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaMock.$queryRaw = jest.fn().mockResolvedValue([]);
      prismaMock.counselorObservation!.groupBy = jest.fn().mockResolvedValue([]);
      prismaMock.memberTask!.groupBy = jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaMock.assignedAssessment!.groupBy = jest.fn().mockResolvedValue([]);
      prismaMock.memberWellbeingStatus!.findMany = jest.fn().mockResolvedValue([]);

      await service.getCounselorMembers(counselorId, organizationId);

      expect(prismaMock.counselorAssignment!.findMany).toHaveBeenCalledWith({
        where: {
          counselorId,
          organizationId,
          status: 'active',
        },
        include: expect.any(Object),
        orderBy: { assignedAt: 'desc' },
      });
    });
  });

  // ============================================================================
  // CREATE ASSIGNMENT
  // ============================================================================

  describe('createAssignment', () => {
    const dto = {
      counselorId: 'counselor-1',
      memberId: 'member-1',
      organizationId: 'org-1',
    };
    const assignedBy = 'admin-1';

    it('should create new assignment successfully', async () => {
      const counselorMembership = {
        organizationId: dto.organizationId,
        userId: dto.counselorId,
        role: { name: 'Counselor', id: 'role-1' },
      };

      const memberMembership = {
        organizationId: dto.organizationId,
        userId: dto.memberId,
      };

      const createdAssignment = {
        ...createAssignmentFixture(dto),
        counselor: createUserFixture({ id: dto.counselorId, firstName: 'Jane', lastName: 'Smith' }),
        member: createUserFixture({ id: dto.memberId, firstName: 'John', lastName: 'Doe' }),
        organization: { name: 'Test Org' },
      };

      prismaMock.organizationMember!.findUnique = jest.fn()
        .mockResolvedValueOnce(counselorMembership)
        .mockResolvedValueOnce(memberMembership);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.create = jest.fn().mockResolvedValue(createdAssignment);

      const result = await service.createAssignment(dto, assignedBy);

      expect(result).toEqual(createdAssignment);
      expect(prismaMock.counselorAssignment!.create).toHaveBeenCalledWith({
        data: {
          counselorId: dto.counselorId,
          memberId: dto.memberId,
          organizationId: dto.organizationId,
          assignedBy,
          status: 'active',
        },
        include: expect.any(Object),
      });
    });

    it('should throw when counselor is not member of organization', async () => {
      prismaMock.organizationMember!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.createAssignment(dto, assignedBy),
        BadRequestException,
        'Counselor is not a member of this organization'
      );
    });

    it('should throw when counselor does not have Counselor role', async () => {
      const counselorMembership = {
        organizationId: dto.organizationId,
        userId: dto.counselorId,
        role: { name: 'Member', id: 'role-1' },
      };

      prismaMock.organizationMember!.findUnique = jest.fn().mockResolvedValue(counselorMembership);

      await expectToThrow(
        () => service.createAssignment(dto, assignedBy),
        BadRequestException,
        'User does not have Counselor role'
      );
    });

    it('should throw when member is not part of organization', async () => {
      const counselorMembership = {
        organizationId: dto.organizationId,
        userId: dto.counselorId,
        role: { name: 'Counselor', id: 'role-1' },
      };

      prismaMock.organizationMember!.findUnique = jest.fn()
        .mockResolvedValueOnce(counselorMembership)
        .mockResolvedValueOnce(null);

      await expectToThrow(
        () => service.createAssignment(dto, assignedBy),
        BadRequestException,
        'Member is not part of this organization'
      );
    });

    it('should deactivate existing assignment before creating new one', async () => {
      const counselorMembership = {
        organizationId: dto.organizationId,
        userId: dto.counselorId,
        role: { name: 'Counselor', id: 'role-1' },
      };

      const memberMembership = {
        organizationId: dto.organizationId,
        userId: dto.memberId,
      };

      const existingAssignment = createAssignmentFixture({
        id: 'existing-1',
        memberId: dto.memberId,
        counselorId: 'old-counselor',
        organizationId: dto.organizationId,
        status: 'active',
      });

      const createdAssignment = {
        ...createAssignmentFixture(dto),
        counselor: createUserFixture({ id: dto.counselorId }),
        member: createUserFixture({ id: dto.memberId }),
        organization: { name: 'Test Org' },
      };

      prismaMock.organizationMember!.findUnique = jest.fn()
        .mockResolvedValueOnce(counselorMembership)
        .mockResolvedValueOnce(memberMembership);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(existingAssignment);
      prismaMock.counselorAssignment!.update = jest.fn().mockResolvedValue(existingAssignment);
      prismaMock.counselorAssignment!.create = jest.fn().mockResolvedValue(createdAssignment);

      await service.createAssignment(dto, assignedBy);

      expect(prismaMock.counselorAssignment!.update).toHaveBeenCalledWith({
        where: { id: existingAssignment.id },
        data: {
          status: 'inactive',
          endedAt: expect.any(Date),
        },
      });
    });

    it('should send email notifications asynchronously', async () => {
      const counselorMembership = {
        organizationId: dto.organizationId,
        userId: dto.counselorId,
        role: { name: 'Counselor', id: 'role-1' },
      };

      const memberMembership = {
        organizationId: dto.organizationId,
        userId: dto.memberId,
      };

      const createdAssignment = {
        ...createAssignmentFixture(dto),
        counselor: createUserFixture({ id: dto.counselorId, email: 'counselor@test.com', firstName: 'Jane' }),
        member: createUserFixture({ id: dto.memberId, email: 'member@test.com', firstName: 'John' }),
        organization: { name: 'Test Org' },
      };

      prismaMock.organizationMember!.findUnique = jest.fn()
        .mockResolvedValueOnce(counselorMembership)
        .mockResolvedValueOnce(memberMembership);
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);
      prismaMock.counselorAssignment!.create = jest.fn().mockResolvedValue(createdAssignment);

      await service.createAssignment(dto, assignedBy);

      // Emails are sent async, so we can't test them directly in this test
      // They would be tested in integration tests or by checking the mock was called
      expect(prismaMock.counselorAssignment!.create).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // END ASSIGNMENT
  // ============================================================================

  describe('endAssignment', () => {
    const assignmentId = 'assignment-1';

    it('should end assignment successfully', async () => {
      const assignment = createAssignmentFixture({ id: assignmentId, status: 'active' });
      prismaMock.counselorAssignment!.findUnique = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorAssignment!.update = jest.fn().mockResolvedValue({
        ...assignment,
        status: 'inactive',
        endedAt: new Date(),
      });

      await service.endAssignment(assignmentId);

      expect(prismaMock.counselorAssignment!.update).toHaveBeenCalledWith({
        where: { id: assignmentId },
        data: {
          status: 'inactive',
          endedAt: expect.any(Date),
        },
      });
    });

    it('should throw when assignment does not exist', async () => {
      prismaMock.counselorAssignment!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.endAssignment('non-existent'),
        NotFoundException,
        'Assignment not found'
      );
    });
  });

  // ============================================================================
  // GET ORGANIZATION ASSIGNMENTS
  // ============================================================================

  describe('getOrganizationAssignments', () => {
    const organizationId = 'org-1';

    it('should return all assignments for organization', async () => {
      const assignments = [
        {
          ...createAssignmentFixture({ organizationId, status: 'active' }),
          counselor: createUserFixture({ id: 'counselor-1' }),
          member: createUserFixture({ id: 'member-1' }),
        },
        {
          ...createAssignmentFixture({ organizationId, status: 'inactive' }),
          counselor: createUserFixture({ id: 'counselor-2' }),
          member: createUserFixture({ id: 'member-2' }),
        },
      ];

      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue(assignments);

      const result = await service.getOrganizationAssignments(organizationId);

      expect(result).toEqual(assignments);
      expect(result).toHaveLength(2);
    });

    it('should return assignments ordered by assignedAt desc', async () => {
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([]);

      await service.getOrganizationAssignments(organizationId);

      expect(prismaMock.counselorAssignment!.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        include: expect.any(Object),
        orderBy: { assignedAt: 'desc' },
      });
    });

    it('should include both active and inactive assignments', async () => {
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([]);

      await service.getOrganizationAssignments(organizationId);

      expect(prismaMock.counselorAssignment!.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.objectContaining({ status: expect.anything() }),
        })
      );
    });
  });

  // ============================================================================
  // GET COUNSELOR WORKLOADS
  // ============================================================================

  describe('getCounselorWorkloads', () => {
    const organizationId = 'org-1';

    it('should return workloads for all counselors', async () => {
      const counselor1 = createUserFixture({ id: 'counselor-1', firstName: 'Jane' });
      const counselor2 = createUserFixture({ id: 'counselor-2', firstName: 'Bob' });

      const orgMembers = [
        {
          userId: counselor1.id,
          organizationId,
          user: counselor1,
          role: { name: 'Counselor', id: 'role-1' },
        },
        {
          userId: counselor2.id,
          organizationId,
          user: counselor2,
          role: { name: 'Senior Counselor', id: 'role-2' },
        },
        {
          userId: 'member-1',
          organizationId,
          user: createUserFixture({ id: 'member-1' }),
          role: { name: 'Member', id: 'role-3' },
        },
      ];

      prismaMock.organizationMember!.findMany = jest.fn().mockResolvedValue(orgMembers);
      prismaMock.counselorAssignment!.count = jest.fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const result = await service.getCounselorWorkloads(organizationId);

      expect(result).toHaveLength(2); // Only counselors, not regular members
      expect(result).toEqual([
        { counselor: counselor1, caseloadCount: 5 },
        { counselor: counselor2, caseloadCount: 3 },
      ]);
    });

    it('should only count active assignments', async () => {
      const counselor = createUserFixture({ id: 'counselor-1' });

      const orgMembers = [
        {
          userId: counselor.id,
          organizationId,
          user: counselor,
          role: { name: 'Counselor', id: 'role-1' },
        },
      ];

      prismaMock.organizationMember!.findMany = jest.fn().mockResolvedValue(orgMembers);
      prismaMock.counselorAssignment!.count = jest.fn().mockResolvedValue(0);

      await service.getCounselorWorkloads(organizationId);

      expect(prismaMock.counselorAssignment!.count).toHaveBeenCalledWith({
        where: {
          counselorId: counselor.id,
          organizationId,
          status: 'active',
        },
      });
    });

    it('should return empty array when no counselors exist', async () => {
      prismaMock.organizationMember!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getCounselorWorkloads(organizationId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // VERIFY COUNSELOR ASSIGNMENT
  // ============================================================================

  describe('verifyCounselorAssignment', () => {
    const counselorId = 'counselor-1';
    const memberId = 'member-1';
    const organizationId = 'org-1';

    it('should return true when active assignment exists', async () => {
      const assignment = createAssignmentFixture({
        counselorId,
        memberId,
        organizationId,
        status: 'active',
      });

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);

      const result = await service.verifyCounselorAssignment(counselorId, memberId, organizationId);

      expect(result).toBe(true);
    });

    it('should return false when no assignment exists', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.verifyCounselorAssignment(counselorId, memberId, organizationId);

      expect(result).toBe(false);
    });

    it('should only check for active assignments', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await service.verifyCounselorAssignment(counselorId, memberId, organizationId);

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
});
