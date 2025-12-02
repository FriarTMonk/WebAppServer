import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EmailTrackingService } from './email-tracking.service';
import { EmailTemplatesService } from './email-templates.service';
import { ConfigService } from '@nestjs/config';

describe('EmailService', () => {
  let service: EmailService;
  let emailTracking: EmailTrackingService;
  let emailTemplates: EmailTemplatesService;

  const mockEmailTracking = {
    logEmailSent: jest.fn().mockResolvedValue(undefined),
    markAsFailed: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailTemplates = {
    renderVerificationEmail: jest.fn().mockReturnValue({
      subject: 'Verify your email',
      html: '<p>Verify</p>',
      text: 'Verify',
    }),
    renderPasswordResetEmail: jest.fn().mockReturnValue({
      subject: 'Reset password',
      html: '<p>Reset</p>',
      text: 'Reset',
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        POSTMARK_API_KEY: '',
        POSTMARK_MOCK_MODE: 'true',
        POSTMARK_FROM_EMAIL: 'test@example.com',
        POSTMARK_FROM_NAME: 'Test',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailTrackingService, useValue: mockEmailTracking },
        { provide: EmailTemplatesService, useValue: mockEmailTemplates },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailTracking = module.get<EmailTrackingService>(EmailTrackingService);
    emailTemplates = module.get<EmailTemplatesService>(EmailTemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock Mode', () => {
    it('should initialize in mock mode by default', () => {
      expect(service).toBeDefined();
    });

    it('should send mock email successfully', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        emailType: 'verification',
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);
      expect(emailTracking.logEmailSent).toHaveBeenCalled();
    });

    it('should handle email sending errors', async () => {
      jest.spyOn(emailTracking, 'logEmailSent').mockRejectedValueOnce(new Error('Tracking error'));

      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        emailType: 'verification',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(emailTracking.markAsFailed).toHaveBeenCalled();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      const result = await service.sendVerificationEmail(
        'user@example.com',
        'John Doe',
        'token-123',
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(emailTemplates.renderVerificationEmail).toHaveBeenCalledWith({
        recipientName: 'John Doe',
        verificationToken: 'token-123',
        expirationHours: 24,
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'John Doe',
        'reset-token',
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(emailTemplates.renderPasswordResetEmail).toHaveBeenCalled();
    });
  });
});
