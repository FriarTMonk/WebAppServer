import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  let service: SafetyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SafetyService],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect crisis keywords', () => {
    const crisisMessages = [
      'I want to kill myself',
      'Thinking about suicide',
      'I want to end my life',
      'I am being abused',
    ];

    crisisMessages.forEach((msg) => {
      expect(service.detectCrisis(msg)).toBe(true);
    });
  });

  it('should not detect crisis in normal messages', () => {
    const normalMessages = [
      'I am feeling sad today',
      'Need guidance on my marriage',
      'How do I find purpose?',
    ];

    normalMessages.forEach((msg) => {
      expect(service.detectCrisis(msg)).toBe(false);
    });
  });

  it('should return crisis resources when detected', () => {
    const resources = service.getCrisisResources();
    expect(resources.length).toBeGreaterThan(0);
    expect(resources[0]).toHaveProperty('name');
    expect(resources[0]).toHaveProperty('contact');
  });
});
