import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://app_mychristiancounselor:apP_mycC!@mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com/mychristiancounselor?sslmode=require&connection_limit=20&pool_timeout=20',
    },
  },
});

const PLATFORM_DEFAULT_RULES = [
  {
    name: 'Crisis Detection → Alert + PHQ-9',
    level: 'platform' as const,
    trigger: { event: 'crisis.detected' },
    conditions: { confidence: 'high' },
    actions: [
      { type: 'send_crisis_alert_email' },
      {
        type: 'auto_assign_assessment',
        assessmentType: 'PHQ-9',
      },
    ],
    priority: 100,
  },
  {
    name: 'Wellbeing Declined → Notify Counselor + Task',
    level: 'platform' as const,
    trigger: { event: 'wellbeing.status.changed' },
    conditions: {
      newStatus: 'red',
    },
    actions: [
      {
        type: 'notify_counselor',
        subject: 'Member wellbeing declined',
        message: 'A member you are counseling has declined to red status.',
      },
      {
        type: 'auto_assign_task',
        taskType: 'conversation_prompt',
        title: 'Check-in conversation',
        description: 'Have a check-in conversation to discuss recent struggles.',
      },
    ],
    priority: 90,
  },
  {
    name: 'PHQ-9 Score Improving → Encouragement',
    level: 'platform' as const,
    trigger: { event: 'assessment.completed' },
    conditions: {
      assessmentType: 'PHQ-9',
    },
    actions: [
      {
        type: 'notify_counselor',
        subject: 'Member showing improvement',
        message: "A member's PHQ-9 score has improved significantly.",
      },
    ],
    priority: 50,
  },
  {
    name: 'Task Overdue → Reminder',
    level: 'platform' as const,
    trigger: { event: 'task.overdue' },
    actions: [
      {
        type: 'notify_counselor',
        subject: 'Task overdue',
        message: 'A task you assigned is now overdue.',
      },
    ],
    priority: 30,
  },
];

async function seedPlatformWorkflowRules() {
  console.log('Seeding platform default workflow rules to PRODUCTION...\n');

  for (const rule of PLATFORM_DEFAULT_RULES) {
    const existing = await prisma.workflowRule.findFirst({
      where: { name: rule.name, level: 'platform' },
    });

    if (existing) {
      console.log(`✓ Rule "${rule.name}" already exists (ID: ${existing.id})`);
      continue;
    }

    const created = await prisma.workflowRule.create({
      data: {
        name: rule.name,
        level: rule.level,
        trigger: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        priority: rule.priority,
        ownerId: null,
        isActive: true,
      },
    });

    console.log(`✓ Created rule: ${rule.name} (ID: ${created.id})`);
  }

  console.log('\n✅ Platform workflow rules seeded successfully in PRODUCTION!');
}

seedPlatformWorkflowRules()
  .catch((e) => {
    console.error('❌ Error seeding rules:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
