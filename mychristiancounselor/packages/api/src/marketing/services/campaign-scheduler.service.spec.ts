import { Test, TestingModule } from '@nestjs/testing';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignExecutionService } from '../campaign-execution.service';
import { DistributedLockService } from '../../common/services/distributed-lock.service';

describe('CampaignSchedulerService', () => {
  let service: CampaignSchedulerService;
  let prisma: PrismaService;
  let campaignExecutionService: CampaignExecutionService;
  let lockService: DistributedLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignSchedulerService,
        {
          provide: PrismaService,
          useValue: {
            emailCampaign: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CampaignExecutionService,
          useValue: {
            executeCampaign: jest.fn(),
          },
        },
        {
          provide: DistributedLockService,
          useValue: {
            withLock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CampaignSchedulerService>(CampaignSchedulerService);
    prisma = module.get<PrismaService>(PrismaService);
    campaignExecutionService = module.get<CampaignExecutionService>(CampaignExecutionService);
    lockService = module.get<DistributedLockService>(DistributedLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find campaigns due for execution', async () => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Test Campaign',
        status: 'scheduled',
        scheduledFor: new Date(),
      },
    ];

    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue(mockCampaigns as any);
    jest.spyOn(prisma.emailCampaign, 'updateMany').mockResolvedValue({ count: 1 } as any);
    jest.spyOn(campaignExecutionService, 'executeCampaign').mockResolvedValue({
      campaignId: '1',
      totalRecipients: 10,
      sent: 10,
      failed: 0,
      skipped: 0,
      errors: [],
    });
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    await service.executeScheduledCampaigns();

    expect(prisma.emailCampaign.findMany).toHaveBeenCalled();
    expect(campaignExecutionService.executeCampaign).toHaveBeenCalledWith('1');
  });

  it('should skip if no campaigns are due', async () => {
    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue([]);
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    await service.executeScheduledCampaigns();

    expect(campaignExecutionService.executeCampaign).not.toHaveBeenCalled();
  });

  it('should handle execution errors gracefully', async () => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Test Campaign',
        status: 'scheduled',
        scheduledFor: new Date(),
      },
    ];

    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue(mockCampaigns as any);
    jest.spyOn(prisma.emailCampaign, 'updateMany').mockResolvedValue({ count: 1 } as any);
    jest.spyOn(campaignExecutionService, 'executeCampaign').mockRejectedValue(new Error('Execution failed'));
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    // Should not throw - errors are caught and logged
    await expect(service.executeScheduledCampaigns()).resolves.not.toThrow();
  });

  it('should skip when lock is already held', async () => {
    jest.spyOn(lockService, 'withLock').mockResolvedValue(null);

    await service.executeScheduledCampaigns();

    expect(prisma.emailCampaign.findMany).not.toHaveBeenCalled();
    expect(campaignExecutionService.executeCampaign).not.toHaveBeenCalled();
  });

  it('should prevent duplicate execution with atomic update', async () => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Test Campaign',
        status: 'scheduled',
        scheduledFor: new Date(),
      },
    ];

    jest.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue(mockCampaigns as any);
    jest.spyOn(prisma.emailCampaign, 'updateMany').mockResolvedValue({ count: 0 } as any); // Already processed
    jest.spyOn(lockService, 'withLock').mockImplementation(async (key, ttl, fn) => fn());

    await service.executeScheduledCampaigns();

    expect(campaignExecutionService.executeCampaign).not.toHaveBeenCalled();
  });
});
