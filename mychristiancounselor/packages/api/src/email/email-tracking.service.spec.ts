import { Test, TestingModule } from '@nestjs/testing';
import { EmailTrackingService } from './email-tracking.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EmailTrackingService', () => {
  let service: EmailTrackingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    emailLog: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    emailCampaignRecipient: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmailTrackingService>(EmailTrackingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markAsDelivered', () => {
    it('should update EmailLog when delivery event received', async () => {
      const postmarkId = 'pm-12345';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsDelivered(postmarkId);

      expect(prisma.emailLog.updateMany).toHaveBeenCalledWith({
        where: { postmarkId },
        data: {
          status: 'delivered',
          deliveredAt: expect.any(Date),
        },
      });
    });

    it('should sync delivery status to EmailCampaignRecipient when linked', async () => {
      const postmarkId = 'pm-12345';
      const emailLogId = 'log-123';
      const recipientId = 'recipient-123';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.emailLog.findFirst.mockResolvedValue({
        id: emailLogId,
        postmarkId,
      });
      mockPrismaService.emailCampaignRecipient.findFirst.mockResolvedValue({
        id: recipientId,
        emailLogId,
      });
      mockPrismaService.emailCampaignRecipient.update.mockResolvedValue({});

      await service.markAsDelivered(postmarkId);

      expect(prisma.emailLog.findFirst).toHaveBeenCalledWith({
        where: { postmarkId },
      });
      expect(prisma.emailCampaignRecipient.findFirst).toHaveBeenCalledWith({
        where: { emailLogId: emailLogId },
      });
      expect(prisma.emailCampaignRecipient.update).toHaveBeenCalledWith({
        where: { id: recipientId },
        data: {
          deliveredAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsOpened', () => {
    it('should update EmailLog when open event received', async () => {
      const postmarkId = 'pm-12345';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsOpened(postmarkId);

      expect(prisma.emailLog.updateMany).toHaveBeenCalledWith({
        where: { postmarkId },
        data: {
          status: 'opened',
          openedAt: expect.any(Date),
        },
      });
    });

    it('should sync opened status to EmailCampaignRecipient when linked', async () => {
      const postmarkId = 'pm-12345';
      const emailLogId = 'log-123';
      const recipientId = 'recipient-123';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.emailLog.findFirst.mockResolvedValue({
        id: emailLogId,
        postmarkId,
      });
      mockPrismaService.emailCampaignRecipient.findFirst.mockResolvedValue({
        id: recipientId,
        emailLogId,
      });
      mockPrismaService.emailCampaignRecipient.update.mockResolvedValue({});

      await service.markAsOpened(postmarkId);

      expect(prisma.emailCampaignRecipient.update).toHaveBeenCalledWith({
        where: { id: recipientId },
        data: {
          openedAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsClicked', () => {
    it('should update EmailLog when click event received', async () => {
      const postmarkId = 'pm-12345';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsClicked(postmarkId);

      expect(prisma.emailLog.updateMany).toHaveBeenCalledWith({
        where: { postmarkId },
        data: {
          clickedAt: expect.any(Date),
        },
      });
    });

    it('should sync clicked status to EmailCampaignRecipient when linked', async () => {
      const postmarkId = 'pm-12345';
      const emailLogId = 'log-123';
      const recipientId = 'recipient-123';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.emailLog.findFirst.mockResolvedValue({
        id: emailLogId,
        postmarkId,
      });
      mockPrismaService.emailCampaignRecipient.findFirst.mockResolvedValue({
        id: recipientId,
        emailLogId,
      });
      mockPrismaService.emailCampaignRecipient.update.mockResolvedValue({});

      await service.markAsClicked(postmarkId);

      expect(prisma.emailCampaignRecipient.update).toHaveBeenCalledWith({
        where: { id: recipientId },
        data: {
          clickedAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsBounced', () => {
    it('should update EmailLog when bounce event received', async () => {
      const postmarkId = 'pm-12345';
      const bounceReason = 'Hard bounce - user does not exist';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsBounced(postmarkId, bounceReason);

      expect(prisma.emailLog.updateMany).toHaveBeenCalledWith({
        where: { postmarkId },
        data: {
          status: 'bounced',
          bounceReason,
          bouncedAt: expect.any(Date),
        },
      });
    });

    it('should sync bounced status to EmailCampaignRecipient when linked', async () => {
      const postmarkId = 'pm-12345';
      const bounceReason = 'Hard bounce - user does not exist';
      const emailLogId = 'log-123';
      const recipientId = 'recipient-123';

      mockPrismaService.emailLog.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.emailLog.findFirst.mockResolvedValue({
        id: emailLogId,
        postmarkId,
      });
      mockPrismaService.emailCampaignRecipient.findFirst.mockResolvedValue({
        id: recipientId,
        emailLogId,
      });
      mockPrismaService.emailCampaignRecipient.update.mockResolvedValue({});

      await service.markAsBounced(postmarkId, bounceReason);

      expect(prisma.emailCampaignRecipient.update).toHaveBeenCalledWith({
        where: { id: recipientId },
        data: {
          bouncedAt: expect.any(Date),
          bounceReason,
        },
      });
    });
  });
});
