import { Test, TestingModule } from '@nestjs/testing';
import { TaskTemplateService } from './task-template.service';

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskTemplateService],
    }).compile();

    service = module.get<TaskTemplateService>(TaskTemplateService);
  });

  describe('getPlatformTemplates', () => {
    it('should return predefined platform templates', () => {
      const templates = service.getPlatformTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('type');
      expect(templates[0]).toHaveProperty('title');
      expect(templates[0]).toHaveProperty('description');
    });

    it('should include conversation prompt templates', () => {
      const templates = service.getPlatformTemplates();
      const conversationTemplates = templates.filter(
        (t) => t.type === 'conversation_prompt',
      );

      expect(conversationTemplates.length).toBeGreaterThan(0);
    });

    it('should include offline task templates', () => {
      const templates = service.getPlatformTemplates();
      const offlineTemplates = templates.filter(
        (t) => t.type === 'offline_task',
      );

      expect(offlineTemplates.length).toBeGreaterThan(0);
    });

    it('should include guided conversation templates', () => {
      const templates = service.getPlatformTemplates();
      const guidedTemplates = templates.filter(
        (t) => t.type === 'guided_conversation',
      );

      expect(guidedTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('getTemplateById', () => {
    it('should return specific template by id', () => {
      const templates = service.getPlatformTemplates();
      const firstTemplate = templates[0];

      const result = service.getTemplateById(firstTemplate.id);

      expect(result).toEqual(firstTemplate);
    });

    it('should return undefined for non-existent template', () => {
      const result = service.getTemplateById('nonexistent-id');

      expect(result).toBeUndefined();
    });
  });
});
