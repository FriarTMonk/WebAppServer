import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrisisAlertService } from './crisis-alert.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email/email-templates.service';

describe('CrisisAlertService', () => {
  let service: CrisisAlertService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    crisisAlertLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    counselorAssignment: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockEmailTemplatesService = {
    renderCrisisAlertEmail: jest.fn().mockReturnValue({
      subject: 'URGENT: Crisis Alert',
      html: '<p>Crisis detected</p>',
      text: 'Crisis detected',
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'WEB_APP_URL') return 'https://test.com';
      return null;
    }),
  };

  const mockEventEmitter = {
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrisisAlertService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: EmailTemplatesService, useValue: mockEmailTemplatesService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CrisisAlertService>(CrisisAlertService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCrisisDetected', () => {
    it('should log crisis but not send email if no counselor assigned', async () => {
      mockPrisma.counselorAssignment.findFirst.mockResolvedValue(null);

      await service.handleCrisisDetected({
        memberId: 'member-123',
        crisisType: 'suicidal_ideation',
        confidence: 'high',
        detectionMethod: 'both',
        triggeringMessage: 'I want to end it all',
        messageId: 'msg-123',
        timestamp: new Date(),
      });

      expect(mockPrisma.crisisAlertLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 'member-123',
            counselorId: null,
            emailSent: false,
            throttled: false,
          }),
        }),
      );
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should send email if counselor assigned and not throttled', async () => {
      mockPrisma.counselorAssignment.findFirst.mockResolvedValue({
        counselorId: 'counselor-123',
        memberId: 'member-123',
      });
      mockPrisma.crisisAlertLog.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'counselor-123',
          firstName: 'John',
          lastName: 'Counselor',
          email: 'john@test.com',
        })
        .mockResolvedValueOnce({
          id: 'member-123',
          firstName: 'Jane',
          lastName: 'Member',
          email: 'jane@test.com',
        });
      mockEmailService.sendEmail.mockResolvedValue({
        success: true,
        emailLogId: 'email-log-123',
      });

      await service.handleCrisisDetected({
        memberId: 'member-123',
        crisisType: 'suicidal_ideation',
        confidence: 'high',
        detectionMethod: 'both',
        triggeringMessage: 'I want to end it all',
        messageId: 'msg-123',
        timestamp: new Date(),
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@test.com',
          emailType: 'crisis_alert',
          priority: 1,
        }),
      );
      expect(mockPrisma.crisisAlertLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: 'member-123',
            counselorId: 'counselor-123',
            emailSent: true,
            emailLogId: 'email-log-123',
          }),
        }),
      );
    });

    it('should throttle if alert sent within 1 hour', async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 30); // 30 minutes ago

      mockPrisma.counselorAssignment.findFirst.mockResolvedValue({
        counselorId: 'counselor-123',
        memberId: 'member-123',
      });
      mockPrisma.crisisAlertLog.findFirst.mockResolvedValue({
        id: 'previous-alert',
        createdAt: oneHourAgo,
        emailSent: true,
      });

      await service.handleCrisisDetected({
        memberId: 'member-123',
        crisisType: 'suicidal_ideation',
        confidence: 'high',
        detectionMethod: 'both',
        triggeringMessage: 'I still feel terrible',
        messageId: 'msg-124',
        timestamp: new Date(),
      });

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      expect(mockPrisma.crisisAlertLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            throttled: true,
            throttleReason: expect.stringContaining('Previous alert sent'),
          }),
        }),
      );
    });
  });
});
