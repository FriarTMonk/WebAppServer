import { Injectable } from '@nestjs/common';
import { MemberTaskType } from '@prisma/client';

export interface ConversationPromptMetadata {
  keywords: string[];
  suggestedScriptures: string[];
}

export interface OfflineTaskMetadata {
  category: string;
  scripture?: string;
}

export interface GuidedConversationMetadata {
  conversationStarter: string;
  followUpPrompts: string[];
}

export type TaskTemplateMetadata =
  | ConversationPromptMetadata
  | OfflineTaskMetadata
  | GuidedConversationMetadata;

export interface TaskTemplate {
  id: string;
  type: MemberTaskType;
  title: string;
  description: string;
  suggestedDurationDays: number;
  metadata?: TaskTemplateMetadata;
}

@Injectable()
export class TaskTemplateService {
  private readonly platformTemplates: TaskTemplate[] = [
    // Conversation Prompt Templates
    {
      id: 'forgiveness-conversation',
      type: 'conversation_prompt',
      title: 'Discuss Forgiveness',
      description:
        'Have a conversation with the AI about forgiving someone who hurt you. Explore biblical perspectives on forgiveness.',
      suggestedDurationDays: 7,
      metadata: {
        keywords: ['forgiveness', 'forgiving', 'forgive'],
        suggestedScriptures: ['Matthew 6:14-15', 'Colossians 3:13'],
      },
    },
    {
      id: 'prayer-life-conversation',
      type: 'conversation_prompt',
      title: 'Reflect on Prayer Life',
      description:
        'Discuss your current prayer habits and explore ways to deepen your prayer life.',
      suggestedDurationDays: 7,
      metadata: {
        keywords: ['prayer', 'praying', 'pray'],
        suggestedScriptures: ['Matthew 6:5-13', '1 Thessalonians 5:17'],
      },
    },
    {
      id: 'anxiety-conversation',
      type: 'conversation_prompt',
      title: 'Discuss Anxiety and Worry',
      description:
        'Talk about sources of anxiety in your life and biblical approaches to finding peace.',
      suggestedDurationDays: 7,
      metadata: {
        keywords: ['anxiety', 'worry', 'anxious', 'worried'],
        suggestedScriptures: ['Philippians 4:6-7', 'Matthew 6:25-34'],
      },
    },
    {
      id: 'purpose-conversation',
      type: 'conversation_prompt',
      title: 'Explore God\'s Purpose',
      description:
        'Reflect on your calling and purpose. Discuss how God might be leading you.',
      suggestedDurationDays: 14,
      metadata: {
        keywords: ['purpose', 'calling', 'mission', 'direction'],
        suggestedScriptures: ['Jeremiah 29:11', 'Ephesians 2:10'],
      },
    },

    // Offline Task Templates
    {
      id: 'daily-scripture-reading',
      type: 'offline_task',
      title: 'Daily Scripture Reading',
      description: 'Read one chapter of Psalms each day this week.',
      suggestedDurationDays: 7,
      metadata: {
        category: 'Scripture Reading',
      },
    },
    {
      id: 'gratitude-journaling',
      type: 'offline_task',
      title: 'Gratitude Journaling',
      description:
        'Write down 3 things you are grateful for each day. Reflect on how God is working in your life.',
      suggestedDurationDays: 14,
      metadata: {
        category: 'Journaling',
      },
    },
    {
      id: 'memorize-scripture',
      type: 'offline_task',
      title: 'Memorize Philippians 4:6-7',
      description:
        'Memorize and meditate on Philippians 4:6-7 this week. Practice reciting it daily.',
      suggestedDurationDays: 7,
      metadata: {
        category: 'Scripture Memorization',
        scripture: 'Philippians 4:6-7',
      },
    },
    {
      id: 'prayer-walk',
      type: 'offline_task',
      title: 'Prayer Walk',
      description:
        'Take a 20-minute prayer walk 3 times this week. Use this time to pray and listen to God.',
      suggestedDurationDays: 7,
      metadata: {
        category: 'Prayer',
      },
    },

    // Guided Conversation Templates
    {
      id: 'grief-processing',
      type: 'guided_conversation',
      title: 'Processing Grief and Loss',
      description:
        'A guided conversation to help you process grief. The AI will walk you through stages of grief from a Christian perspective.',
      suggestedDurationDays: 14,
      metadata: {
        conversationStarter:
          'I understand you are experiencing grief or loss. Let\'s take time to process this together. Can you tell me about your loss?',
        followUpPrompts: [
          'How are you feeling right now?',
          'What memories bring you comfort?',
          'How has your faith been affected by this loss?',
          'What scriptures or prayers have helped?',
        ],
      },
    },
    {
      id: 'anger-management',
      type: 'guided_conversation',
      title: 'Managing Anger Biblically',
      description:
        'A guided conversation exploring anger triggers and biblical strategies for healthy anger management.',
      suggestedDurationDays: 7,
      metadata: {
        conversationStarter:
          'Let\'s talk about anger. Anger itself is not sinful, but how we handle it matters. What situations trigger anger for you?',
        followUpPrompts: [
          'How do you typically respond when angry?',
          'What does the Bible say about anger?',
          'What healthy outlets could you use?',
        ],
      },
    },
  ];

  /**
   * Get all platform-defined task templates
   */
  getPlatformTemplates(): TaskTemplate[] {
    return this.platformTemplates;
  }

  /**
   * Get a specific template by ID
   */
  getTemplateById(templateId: string): TaskTemplate | undefined {
    return this.platformTemplates.find((t) => t.id === templateId);
  }

  /**
   * Get templates filtered by type
   */
  getTemplatesByType(type: MemberTaskType): TaskTemplate[] {
    return this.platformTemplates.filter((t) => t.type === type);
  }
}
