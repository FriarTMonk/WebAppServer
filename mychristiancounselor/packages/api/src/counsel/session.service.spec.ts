import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import {
  createPrismaMock,
  createSessionFixture,
  createMessageFixture,
} from '../testing';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../scripture/translation.service';

describe('SessionService', () => {
  let service: SessionService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let translationMock: Partial<TranslationService>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    translationMock = {
      validateTranslation: jest.fn().mockResolvedValue('KJV'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TranslationService, useValue: translationMock },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  // ============================================================================
  // getSession
  // ============================================================================

  describe('getSession', () => {
    it('should return session with messages ordered by timestamp', async () => {
      const session = createSessionFixture({
        messages: [
          createMessageFixture({ timestamp: new Date('2024-01-01') }),
          createMessageFixture({ timestamp: new Date('2024-01-02') }),
        ],
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(session);

      const result = await service.getSession('session-1');

      expect(result).toEqual(session);
      expect(prismaMock.session!.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });
    });

    it('should return null when session does not exist', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getOrCreateSession
  // ============================================================================

  describe('getOrCreateSession', () => {
    const userId = 'user-1';
    const message = 'I need guidance on forgiveness';
    const themes = ['forgiveness', 'grace'];
    const translation = 'NIV';

    it('should return existing session when sessionId is provided and exists', async () => {
      const existingSession = createSessionFixture({
        id: 'existing-session',
        userId,
        preferredTranslation: 'KJV',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(existingSession);

      const result = await service.getOrCreateSession(
        'existing-session',
        userId,
        true,
        message,
        themes,
        translation as any
      );

      expect(result.id).toBe('existing-session');
      expect(prismaMock.session!.findUnique).toHaveBeenCalled();
    });

    it('should create new session for subscribed user when no existing session', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);
      const newSession = createSessionFixture({
        userId,
        title: message.substring(0, 50),
        topics: JSON.stringify(themes),
        preferredTranslation: 'KJV',
      });
      prismaMock.session!.create = jest.fn().mockResolvedValue(newSession);

      const result = await service.getOrCreateSession(
        undefined,
        userId,
        true,
        message,
        themes,
        translation as any
      );

      expect(result).toEqual(newSession);
      expect(prismaMock.session!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          title: message,
          topics: JSON.stringify(themes),
          status: 'active',
          preferredTranslation: 'KJV',
        }),
        include: { messages: true },
      });
    });

    it('should truncate long titles with ellipsis', async () => {
      const longMessage = 'a'.repeat(100);
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);
      prismaMock.session!.create = jest.fn().mockResolvedValue(
        createSessionFixture({ title: longMessage.substring(0, 50) + '...' })
      );

      await service.getOrCreateSession(
        undefined,
        userId,
        true,
        longMessage,
        themes,
        translation as any
      );

      expect(prismaMock.session!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: longMessage.substring(0, 50) + '...',
        }),
        include: { messages: true },
      });
    });

    it('should create temporary session for free user', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getOrCreateSession(
        undefined,
        userId,
        false, // canSaveSession = false
        message,
        themes,
        translation as any
      );

      expect(result).toMatchObject({
        userId,
        title: '',
        topics: JSON.stringify(themes),
        status: 'active',
        preferredTranslation: 'KJV',
        messages: [],
      });
      expect(result.id).toBeDefined();
      expect(prismaMock.session!.create).not.toHaveBeenCalled();
    });

    it('should create temporary session for anonymous user', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getOrCreateSession(
        undefined,
        null, // anonymous user
        false,
        message,
        themes,
        translation as any
      );

      expect(result).toMatchObject({
        userId: null,
        title: '',
        topics: JSON.stringify(themes),
        status: 'active',
        preferredTranslation: 'KJV',
        messages: [],
      });
      expect(prismaMock.session!.create).not.toHaveBeenCalled();
    });

    it('should update translation preference when changed', async () => {
      const existingSession = createSessionFixture({
        id: 'existing-session',
        userId,
        preferredTranslation: 'KJV',
      });
      const updatedSession = { ...existingSession, preferredTranslation: 'NIV' };
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(existingSession);
      translationMock.validateTranslation = jest.fn().mockResolvedValue('NIV');
      prismaMock.session!.update = jest.fn().mockResolvedValue(updatedSession);

      const result = await service.getOrCreateSession(
        'existing-session',
        userId,
        true,
        message,
        themes,
        'NIV' as any
      );

      expect(prismaMock.session!.update).toHaveBeenCalledWith({
        where: { id: 'existing-session' },
        data: { preferredTranslation: 'NIV' },
        include: { messages: true },
      });
      expect(result.preferredTranslation).toBe('NIV');
    });

    it('should not update translation when unchanged', async () => {
      const existingSession = createSessionFixture({
        id: 'existing-session',
        userId,
        preferredTranslation: 'KJV',
      });
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(existingSession);
      translationMock.validateTranslation = jest.fn().mockResolvedValue('KJV');

      const result = await service.getOrCreateSession(
        'existing-session',
        userId,
        true,
        message,
        themes,
        'KJV' as any
      );

      expect(prismaMock.session!.update).not.toHaveBeenCalled();
      expect(result.preferredTranslation).toBe('KJV');
    });

    it('should validate translation preference', async () => {
      prismaMock.session!.findUnique = jest.fn().mockResolvedValue(null);

      await service.getOrCreateSession(
        undefined,
        null,
        false,
        message,
        themes,
        'INVALID' as any
      );

      expect(translationMock.validateTranslation).toHaveBeenCalledWith('INVALID');
    });
  });

  // ============================================================================
  // createUserMessage
  // ============================================================================

  describe('createUserMessage', () => {
    it('should create user message when user can save session', async () => {
      const message = createMessageFixture({ role: 'user', content: 'Test message' });
      prismaMock.message!.create = jest.fn().mockResolvedValue(message);

      await service.createUserMessage('session-1', 'Test message', true);

      expect(prismaMock.message!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-1',
          role: 'user',
          content: 'Test message',
          scriptureReferences: [],
        }),
      });
    });

    it('should skip message creation when user cannot save session', async () => {
      await service.createUserMessage('session-1', 'Test message', false);

      expect(prismaMock.message!.create).not.toHaveBeenCalled();
    });

    it('should set proper message fields', async () => {
      prismaMock.message!.create = jest.fn().mockResolvedValue(createMessageFixture());

      await service.createUserMessage('session-1', 'Test message', true);

      expect(prismaMock.message!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'user',
          content: 'Test message',
          scriptureReferences: [],
          timestamp: expect.any(Date),
        }),
      });
    });
  });

  // ============================================================================
  // createAssistantMessage
  // ============================================================================

  describe('createAssistantMessage', () => {
    const scriptureRefs = [{ reference: 'John 3:16', text: 'For God so loved...' }];

    it('should create assistant message when user can save session', async () => {
      const message = createMessageFixture({
        role: 'assistant',
        content: 'Response',
        scriptureReferences: scriptureRefs,
        isClarifyingQuestion: false,
      });
      prismaMock.message!.create = jest.fn().mockResolvedValue(message);

      const result = await service.createAssistantMessage(
        'session-1',
        'Response',
        scriptureRefs,
        false,
        true
      );

      expect(result).toEqual(message);
      expect(prismaMock.message!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Response',
          scriptureReferences: scriptureRefs,
          isClarifyingQuestion: false,
        }),
      });
    });

    it('should return temporary message when user cannot save session', async () => {
      const result = await service.createAssistantMessage(
        'session-1',
        'Response',
        scriptureRefs,
        false,
        false
      );

      expect(result).toMatchObject({
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Response',
        scriptureReferences: scriptureRefs,
        isClarifyingQuestion: false,
        timestamp: expect.any(Date),
      });
      expect(result.id).toBeDefined();
      expect(prismaMock.message!.create).not.toHaveBeenCalled();
    });

    it('should handle clarifying questions', async () => {
      const message = createMessageFixture({ isClarifyingQuestion: true });
      prismaMock.message!.create = jest.fn().mockResolvedValue(message);

      await service.createAssistantMessage(
        'session-1',
        'Question?',
        [],
        true, // isClarifyingQuestion
        true
      );

      expect(prismaMock.message!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isClarifyingQuestion: true,
        }),
      });
    });

    it('should handle empty scripture references', async () => {
      const message = createMessageFixture({ scriptureReferences: [] });
      prismaMock.message!.create = jest.fn().mockResolvedValue(message);

      await service.createAssistantMessage(
        'session-1',
        'Response',
        [],
        false,
        true
      );

      expect(prismaMock.message!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scriptureReferences: [],
        }),
      });
    });
  });

  // ============================================================================
  // countClarifyingQuestions
  // ============================================================================

  describe('countClarifyingQuestions', () => {
    it('should count clarifying questions correctly', () => {
      const session = createSessionFixture({
        messages: [
          createMessageFixture({ role: 'user', isClarifyingQuestion: false }),
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: true }),
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: false }),
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: true }),
          createMessageFixture({ role: 'user', isClarifyingQuestion: false }),
        ],
      });

      const count = service.countClarifyingQuestions(session);

      expect(count).toBe(2);
    });

    it('should return 0 when no clarifying questions', () => {
      const session = createSessionFixture({
        messages: [
          createMessageFixture({ role: 'user', isClarifyingQuestion: false }),
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: false }),
        ],
      });

      const count = service.countClarifyingQuestions(session);

      expect(count).toBe(0);
    });

    it('should return 0 for empty message list', () => {
      const session = createSessionFixture({ messages: [] });

      const count = service.countClarifyingQuestions(session);

      expect(count).toBe(0);
    });

    it('should only count assistant messages', () => {
      const session = createSessionFixture({
        messages: [
          createMessageFixture({ role: 'user', isClarifyingQuestion: true }), // Should not count
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: true }), // Should count
        ],
      });

      const count = service.countClarifyingQuestions(session);

      expect(count).toBe(1);
    });

    it('should handle null/undefined isClarifyingQuestion as false', () => {
      const session = createSessionFixture({
        messages: [
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: undefined }),
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: null }),
          createMessageFixture({ role: 'assistant', isClarifyingQuestion: true }),
        ],
      });

      const count = service.countClarifyingQuestions(session);

      expect(count).toBe(1);
    });
  });
});
