import { PrismaClient } from '@prisma/client';
import { PLATFORM_DEFAULT_RULES } from './platform-rules.seed';

const prisma = new PrismaClient();

async function seedPlatformRules() {
  console.log('Seeding platform default workflow rules...');

  for (const rule of PLATFORM_DEFAULT_RULES) {
    const existing = await prisma.workflowRule.findFirst({
      where: { name: rule.name, level: 'platform' },
    });

    if (existing) {
      console.log(`Rule "${rule.name}" already exists, skipping`);
      continue;
    }

    await prisma.workflowRule.create({
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

    console.log(`Created rule: ${rule.name}`);
  }

  console.log('Platform rules seeded successfully');
}

seedPlatformRules()
  .catch((e) => {
    console.error('Error seeding rules:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
