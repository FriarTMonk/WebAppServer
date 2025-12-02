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

  describe('detectCrisis', () => {
    describe('suicide detection', () => {
      it('should detect direct suicide keywords', () => {
        const crisisMessages = [
          'I want to kill myself',
          'Thinking about suicide',
          'I want to end my life',
          'I am suicidal',
          'want to take my life',
        ];

        crisisMessages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(true);
        });
      });

      it('should detect suicide with punctuation', () => {
        const messages = [
          'I want to kill myself.',
          'Thinking about suicide...',
          'I want to end my life!',
        ];

        messages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(true);
        });
      });

      it('should detect suicide variations', () => {
        const messages = [
          'I want to hurt myself',
          'I want to harm myself',
          'better off dead',
          'wish I was dead',
          'wish I were dead',
          'no reason to live',
        ];

        messages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(true);
        });
      });
    });

    describe('self-harm detection', () => {
      it('should detect self-harm keywords', () => {
        const messages = [
          'I want to self-harm',
          'I engage in self harm',
          'I cut myself',
          'thinking of selfharm',
        ];

        messages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(true);
        });
      });
    });

    describe('abuse detection', () => {
      it('should detect abuse keywords', () => {
        const messages = [
          'I am being abused',
          'experiencing abuse',
          'domestic violence',
          'he beats me',
          'I was raped',
          'sexual assault',
          'being molested',
        ];

        messages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(true);
        });
      });

      it('should detect abuse variations', () => {
        const messages = [
          'he raped me',
          'I am being beaten',
          'sexually assaulted',
          'molesting me',
        ];

        messages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(true);
        });
      });
    });

    describe('false positives', () => {
      it('should not detect crisis in normal messages', () => {
        const normalMessages = [
          'I am feeling sad today',
          'Need guidance on my marriage',
          'How do I find purpose?',
          'Feeling depressed lately',
          'Struggling with anxiety',
          'Having a tough day',
        ];

        normalMessages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(false);
        });
      });

      it('should not detect crisis in context with non-crisis words', () => {
        const messages = [
          'This movie is killing me with laughter',
          'I am dying to see you',
          'That joke was so bad I wanted to hurt the comedian',
        ];

        messages.forEach((msg) => {
          expect(service.detectCrisis(msg)).toBe(false);
        });
      });
    });
  });

  describe('getCrisisResources', () => {
    it('should return crisis resources', () => {
      const resources = service.getCrisisResources();
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('name');
      expect(resources[0]).toHaveProperty('contact');
      expect(resources[0]).toHaveProperty('description');
    });
  });

  describe('generateCrisisResponse', () => {
    it('should generate crisis response with resources', () => {
      const response = service.generateCrisisResponse();
      expect(response).toContain('safety');
      expect(response).toContain('911');
      expect(response).toContain('professional');
    });

    it('should include resource details', () => {
      const response = service.generateCrisisResponse();
      const resources = service.getCrisisResources();

      resources.forEach(resource => {
        expect(response).toContain(resource.name);
        expect(response).toContain(resource.contact);
      });
    });
  });

  describe('detectGrief', () => {
    describe('loss detection', () => {
      it('should detect loss of loved ones', () => {
        const griefMessages = [
          'I lost my mother',
          'my father died',
          'my son passed away',
          'losing my wife',
          'my husband is gone',
          'death of my child',
        ];

        griefMessages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(true);
        });
      });

      it('should detect various relationships', () => {
        const messages = [
          'my grandmother died',
          'lost my grandfather',
          'my brother passed away',
          'my sister is gone',
          'my friend died',
          'lost a loved one',
        ];

        messages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(true);
        });
      });
    });

    describe('terminal illness detection', () => {
      it('should detect terminal illness', () => {
        const messages = [
          'he is terminally ill',
          'terminal cancer',
          'she is dying',
          'in hospice care',
          'palliative care',
          'not long to live',
        ];

        messages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(true);
        });
      });

      it('should detect end of life situations', () => {
        const messages = [
          'end of life care',
          'final days',
          'last hours',
          'time is running out',
          'on life support',
          'intensive care',
        ];

        messages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(true);
        });
      });
    });

    describe('mourning detection', () => {
      it('should detect mourning and funeral terms', () => {
        const messages = [
          'at the funeral',
          'grieving the loss',
          'memorial service',
          'we buried him',
          'heartbroken',
          'devastated by the loss',
        ];

        messages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(true);
        });
      });

      it('should detect emotional grief expressions', () => {
        const messages = [
          'miss them so much',
          'wish she was still here',
          'gone too soon',
          'can\'t believe he\'s gone',
          'life without her',
          'hole in my heart',
        ];

        messages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(true);
        });
      });
    });

    describe('false positives', () => {
      it('should not detect grief in normal messages', () => {
        const normalMessages = [
          'I am having a great day',
          'Enjoying time with family',
          'Looking forward to the weekend',
          'Need advice on my career',
        ];

        normalMessages.forEach((msg) => {
          expect(service.detectGrief(msg)).toBe(false);
        });
      });
    });
  });

  describe('getGriefResources', () => {
    it('should return grief resources', () => {
      const resources = service.getGriefResources();
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('name');
      expect(resources[0]).toHaveProperty('contact');
      expect(resources[0]).toHaveProperty('description');
    });
  });

  describe('generateGriefResponse', () => {
    it('should generate compassionate grief response', () => {
      const response = service.generateGriefResponse();
      expect(response).toContain('sorry');
      expect(response).toContain('grief');
      expect(response).toContain('Psalm');
    });

    it('should include grief resource details', () => {
      const response = service.generateGriefResponse();
      const resources = service.getGriefResources();

      resources.forEach(resource => {
        expect(response).toContain(resource.name);
        expect(response).toContain(resource.contact);
      });
    });
  });

  describe('text normalization', () => {
    it('should handle different punctuation', () => {
      const messages = [
        'I want to kill myself!!!',
        'I want to kill myself...',
        'I want to kill myself???',
        'I, want, to, kill, myself',
      ];

      messages.forEach((msg) => {
        expect(service.detectCrisis(msg)).toBe(true);
      });
    });

    it('should handle different capitalizations', () => {
      const messages = [
        'I WANT TO KILL MYSELF',
        'i want to kill myself',
        'I Want To Kill Myself',
      ];

      messages.forEach((msg) => {
        expect(service.detectCrisis(msg)).toBe(true);
      });
    });

    it('should handle extra spaces', () => {
      const messages = [
        'I  want  to  kill  myself',
        'I    want    to    kill    myself',
      ];

      messages.forEach((msg) => {
        expect(service.detectCrisis(msg)).toBe(true);
      });
    });
  });
});
