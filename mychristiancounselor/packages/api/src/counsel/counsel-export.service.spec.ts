import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CounselExportService } from './counsel-export.service';
import {
  createPrismaMock,
  createSessionFixture,
  createUserFixture,
  createNoteFixture,
  createAssignmentFixture,
  expectToThrow,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';

describe('CounselExportService', () => {
  let service: CounselExportService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounselExportService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CounselExportService>(CounselExportService);
  });

  // ============================================================================
  // GET SESSION FOR EXPORT
  // ============================================================================

  describe('getSessionForExport', () => {
    const sessionId = 'session-1';
    const userId = 'user-1';

    it('should return complete export data for session owner', async () => {
      const user = createUserFixture({ id: userId, firstName: 'John', lastName: 'Doe' });
      const messages = [
        {
          id: 'msg-1',
          sessionId,
          role: 'user',
          content: 'Hello, I need guidance',
          timestamp: new Date('2025-01-01'),
          scriptureReferences: null,
        },
        {
          id: 'msg-2',
          sessionId,
          role: 'assistant',
          content: 'Consider John 3:16 for encouragement',
          timestamp: new Date('2025-01-02'),
          scriptureReferences: [{ reference: 'John 3:16', text: 'For God so loved...' }],
        },
      ];

      const session = {
        ...createSessionFixture({ id: sessionId, userId }),
        messages,
        user,
      };

      const notes = [
        createNoteFixture({ sessionId, isPrivate: false, content: 'Public note' }),
        createNoteFixture({ sessionId, isPrivate: true, authorId: userId, content: 'My private note' }),
      ];

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue(notes);

      const result = await service.getSessionForExport(sessionId, userId);

      expect(result.session).toEqual(session);
      expect(result.messages).toEqual(messages);
      expect(result.notes).toEqual(notes);
      expect(result.scriptureReferences).toHaveLength(1);
      expect(result.scriptureReferences[0].reference).toBe('John 3:16');
    });

    it('should throw when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.getSessionForExport('non-existent', userId),
        NotFoundException,
        'Session not found'
      );
    });

    it('should throw when user does not own session', async () => {
      const session = createSessionFixture({ id: sessionId, userId: 'other-user' });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      await expectToThrow(
        () => service.getSessionForExport(sessionId, userId),
        ForbiddenException,
        'You do not have access to this session'
      );
    });

    it('should filter notes to include only public and user-authored private notes', async () => {
      const session = createSessionFixture({ id: sessionId, userId });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue({ ...session, messages: [] });
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      await service.getSessionForExport(sessionId, userId);

      expect(prismaMock.sessionNote!.findMany).toHaveBeenCalledWith({
        where: {
          sessionId,
          OR: [
            { isPrivate: false },
            { authorId: userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should extract scripture references from message content', async () => {
      const messages = [
        {
          id: 'msg-1',
          sessionId,
          role: 'assistant',
          content: 'Consider John 3:16 and Romans 8:28 for encouragement',
          timestamp: new Date(),
          scriptureReferences: null,
        },
        {
          id: 'msg-2',
          sessionId,
          role: 'assistant',
          content: 'Also read 1 Corinthians 13:4-7',
          timestamp: new Date(),
          scriptureReferences: null,
        },
      ];

      const session = {
        ...createSessionFixture({ id: sessionId, userId }),
        messages,
      };

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getSessionForExport(sessionId, userId);

      expect(result.scriptureReferences.length).toBeGreaterThan(0);
      const references = result.scriptureReferences.map(r => r.reference);
      expect(references).toContain('John 3:16');
      expect(references).toContain('Romans 8:28');
      expect(references).toContain('1 Corinthians 13:4-7');
    });

    it('should extract scripture references from scriptureReferences JSON field', async () => {
      const messages = [
        {
          id: 'msg-1',
          sessionId,
          role: 'assistant',
          content: 'Here are some verses',
          timestamp: new Date(),
          scriptureReferences: [
            { reference: 'Psalm 23:1', text: 'The Lord is my shepherd' },
            { reference: 'Matthew 5:5', text: 'Blessed are the meek' },
          ],
        },
      ];

      const session = {
        ...createSessionFixture({ id: sessionId, userId }),
        messages,
      };

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getSessionForExport(sessionId, userId);

      const references = result.scriptureReferences.map(r => r.reference);
      expect(references).toContain('Psalm 23:1');
      expect(references).toContain('Matthew 5:5');
    });

    it('should return unique scripture references only', async () => {
      const messages = [
        {
          id: 'msg-1',
          sessionId,
          role: 'assistant',
          content: 'John 3:16 is important',
          timestamp: new Date(),
          scriptureReferences: null,
        },
        {
          id: 'msg-2',
          sessionId,
          role: 'assistant',
          content: 'Remember John 3:16 again',
          timestamp: new Date(),
          scriptureReferences: null,
        },
      ];

      const session = {
        ...createSessionFixture({ id: sessionId, userId }),
        messages,
      };

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getSessionForExport(sessionId, userId);

      const john316Refs = result.scriptureReferences.filter(r => r.reference === 'John 3:16');
      expect(john316Refs).toHaveLength(1);
    });

    it('should handle messages with no scripture references', async () => {
      const messages = [
        {
          id: 'msg-1',
          sessionId,
          role: 'user',
          content: 'I am feeling anxious today',
          timestamp: new Date(),
          scriptureReferences: null,
        },
      ];

      const session = {
        ...createSessionFixture({ id: sessionId, userId }),
        messages,
      };

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getSessionForExport(sessionId, userId);

      expect(result.scriptureReferences).toEqual([]);
    });

    it('should order messages by timestamp ascending', async () => {
      const session = {
        ...createSessionFixture({ id: sessionId, userId }),
        messages: [],
      };

      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);
      prismaMock.sessionNote!.findMany = jest.fn().mockResolvedValue([]);

      await service.getSessionForExport(sessionId, userId);

      expect(prismaMock.session!.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
          user: expect.any(Object),
        },
      });
    });
  });

  // ============================================================================
  // GET MEMBER PROFILE FOR EXPORT
  // ============================================================================

  describe('getMemberProfileForExport', () => {
    const memberId = 'member-1';
    const counselorId = 'counselor-1';
    const organizationId = 'org-1';

    it('should return complete member profile data for assigned counselor', async () => {
      const member = createUserFixture({ id: memberId, firstName: 'John', lastName: 'Doe' });
      const counselor = createUserFixture({ id: counselorId, firstName: 'Jane', lastName: 'Smith' });
      const organization = { id: organizationId, name: 'Test Org', description: 'Test Description' };

      const assignment = {
        ...createAssignmentFixture({ counselorId, memberId, organizationId, status: 'active' }),
        counselor,
        member,
        organization,
      };

      const observations = [
        {
          id: 'obs-1',
          memberId,
          counselorId,
          content: 'Member is progressing well',
          createdAt: new Date('2025-01-02'),
          deletedAt: null,
        },
        {
          id: 'obs-2',
          memberId,
          counselorId,
          content: 'Initial assessment',
          createdAt: new Date('2025-01-01'),
          deletedAt: null,
        },
      ];

      const assignmentHistory = [
        {
          ...createAssignmentFixture({ memberId, counselorId, organizationId, status: 'active' }),
          counselor,
        },
      ];

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue(observations);
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue(assignmentHistory);

      const result = await service.getMemberProfileForExport(memberId, counselorId, organizationId);

      expect(result.member).toEqual(member);
      expect(result.counselor).toEqual(counselor);
      expect(result.organization).toEqual(organization);
      expect(result.observations).toEqual(observations);
      expect(result.assignmentHistory).toHaveLength(1);
    });

    it('should throw when counselor is not assigned to member', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.getMemberProfileForExport(memberId, counselorId, organizationId),
        ForbiddenException,
        'You do not have access to this member'
      );
    });

    it('should only include active assignment for access check', async () => {
      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(null);

      await expectToThrow(
        () => service.getMemberProfileForExport(memberId, counselorId, organizationId),
        ForbiddenException,
        'You do not have access to this member'
      );

      expect(prismaMock.counselorAssignment!.findFirst).toHaveBeenCalledWith({
        where: {
          counselorId,
          memberId,
          organizationId,
          status: 'active',
        },
        include: expect.any(Object),
      });
    });

    it('should exclude deleted observations', async () => {
      const assignment = {
        ...createAssignmentFixture({ counselorId, memberId, organizationId }),
        member: createUserFixture({ id: memberId }),
        counselor: createUserFixture({ id: counselorId }),
        organization: { id: organizationId, name: 'Org' },
      };

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([]);

      await service.getMemberProfileForExport(memberId, counselorId, organizationId);

      expect(prismaMock.counselorObservation!.findMany).toHaveBeenCalledWith({
        where: {
          memberId,
          counselorId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should order observations by creation date descending', async () => {
      const assignment = {
        ...createAssignmentFixture({ counselorId, memberId, organizationId }),
        member: createUserFixture({ id: memberId }),
        counselor: createUserFixture({ id: counselorId }),
        organization: { id: organizationId, name: 'Org' },
      };

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue([]);

      await service.getMemberProfileForExport(memberId, counselorId, organizationId);

      expect(prismaMock.counselorObservation!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should include assignment history for member in organization', async () => {
      const member = createUserFixture({ id: memberId });
      const counselor1 = createUserFixture({ id: counselorId, firstName: 'Jane', lastName: 'Smith' });
      const counselor2 = createUserFixture({ id: 'counselor-2', firstName: 'Bob', lastName: 'Jones' });

      const assignment = {
        ...createAssignmentFixture({ counselorId, memberId, organizationId }),
        member,
        counselor: counselor1,
        organization: { id: organizationId, name: 'Org' },
      };

      const assignmentHistory = [
        {
          ...createAssignmentFixture({ counselorId, memberId, organizationId, status: 'active' }),
          counselor: counselor1,
        },
        {
          ...createAssignmentFixture({ counselorId: 'counselor-2', memberId, organizationId, status: 'inactive' }),
          counselor: counselor2,
        },
      ];

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue(assignmentHistory);

      const result = await service.getMemberProfileForExport(memberId, counselorId, organizationId);

      expect(result.assignmentHistory).toHaveLength(2);
      expect(result.assignmentHistory[0].counselorName).toBe('Jane Smith');
      expect(result.assignmentHistory[1].counselorName).toBe('Bob Jones');
    });

    it('should format counselor name from first and last name', async () => {
      const counselor = createUserFixture({ id: counselorId, firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' });
      const assignment = {
        ...createAssignmentFixture({ counselorId, memberId, organizationId }),
        member: createUserFixture({ id: memberId }),
        counselor,
        organization: { id: organizationId, name: 'Org' },
      };

      const assignmentHistory = [
        {
          ...createAssignmentFixture({ counselorId, memberId, organizationId }),
          counselor,
        },
      ];

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue(assignmentHistory);

      const result = await service.getMemberProfileForExport(memberId, counselorId, organizationId);

      expect(result.assignmentHistory[0].counselorName).toBe('Jane Smith');
    });

    it('should use email as fallback when counselor has no name', async () => {
      const counselor = createUserFixture({ id: counselorId, firstName: '', lastName: '', email: 'jane@test.com' });
      const assignment = {
        ...createAssignmentFixture({ counselorId, memberId, organizationId }),
        member: createUserFixture({ id: memberId }),
        counselor,
        organization: { id: organizationId, name: 'Org' },
      };

      const assignmentHistory = [
        {
          ...createAssignmentFixture({ counselorId, memberId, organizationId }),
          counselor,
        },
      ];

      prismaMock.counselorAssignment!.findFirst = jest.fn().mockResolvedValue(assignment);
      prismaMock.counselorObservation!.findMany = jest.fn().mockResolvedValue([]);
      prismaMock.counselorAssignment!.findMany = jest.fn().mockResolvedValue(assignmentHistory);

      const result = await service.getMemberProfileForExport(memberId, counselorId, organizationId);

      expect(result.assignmentHistory[0].counselorName).toBe('jane@test.com');
    });
  });
});
