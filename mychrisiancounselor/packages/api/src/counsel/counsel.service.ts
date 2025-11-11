import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ScriptureService } from '../scripture/scripture.service';
import { SafetyService } from '../safety/safety.service';
import { CounselResponse } from '@mychrisiancounselor/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CounselService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private scriptureService: ScriptureService,
    private safetyService: SafetyService
  ) {}

  async processQuestion(
    message: string,
    sessionId?: string
  ): Promise<CounselResponse> {
    // 1. Check for crisis
    const isCrisis = this.safetyService.detectCrisis(message);

    if (isCrisis) {
      return {
        sessionId: sessionId || uuidv4(),
        message: {
          id: uuidv4(),
          sessionId: sessionId || '',
          role: 'system',
          content: this.safetyService.generateCrisisResponse(),
          scriptureReferences: [],
          timestamp: new Date(),
        },
        requiresClarification: false,
        isCrisisDetected: true,
        crisisResources: this.safetyService.getCrisisResources(),
      };
    }

    // 2. Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { timestamp: 'asc' } } },
      });
    }

    if (!session) {
      // Create new session with title from first message
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      session = await this.prisma.session.create({
        data: {
          id: uuidv4(),
          userId: null, // Anonymous for MVP
          title,
          status: 'active',
        },
        include: { messages: true },
      });
    }

    // 3. Store user message
    await this.prisma.message.create({
      data: {
        id: uuidv4(),
        sessionId: session.id,
        role: 'user',
        content: message,
        scriptureReferences: [],
        timestamp: new Date(),
      },
    });

    // 4. Count clarifying questions so far
    const clarificationCount = session.messages.filter(
      (m) => m.role === 'assistant' && m.content.includes('?')
    ).length;

    // 5. Retrieve relevant scriptures
    const scriptures = await this.scriptureService.retrieveRelevantScriptures(
      message,
      3
    );

    // 6. Build conversation history
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 7. Generate AI response
    const aiResponse = await this.aiService.generateResponse(
      message,
      scriptures,
      conversationHistory,
      clarificationCount
    );

    // 8. Extract scripture references from response
    const extractedRefs = this.aiService.extractScriptureReferences(
      aiResponse.content
    );

    // 9. Store assistant message
    const assistantMessage = await this.prisma.message.create({
      data: {
        id: uuidv4(),
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        scriptureReferences: scriptures,
        timestamp: new Date(),
      },
    });

    // 10. Return response
    return {
      sessionId: session.id,
      message: {
        id: assistantMessage.id,
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse.content,
        scriptureReferences: scriptures,
        timestamp: assistantMessage.timestamp,
      },
      requiresClarification: aiResponse.requiresClarification,
      isCrisisDetected: false,
    };
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }
}
