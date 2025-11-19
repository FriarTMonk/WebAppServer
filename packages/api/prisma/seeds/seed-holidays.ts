import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHolidays() {
  console.log('Seeding federal holidays...');

  // Get first platform admin to assign as creator
  const platformAdmin = await prisma.user.findFirst({
    where: { isPlatformAdmin: true },
  });

  if (!platformAdmin) {
    console.warn('No platform admin found, skipping holiday seed');
    return;
  }

  const federalHolidays = [
    {
      name: "New Year's Day",
      date: new Date('2025-01-01'),
      isRecurring: true,
    },
    {
      name: 'Memorial Day',
      date: new Date('2025-05-26'), // Last Monday in May 2025
      isRecurring: true,
    },
    {
      name: 'Independence Day',
      date: new Date('2025-07-04'),
      isRecurring: true,
    },
    {
      name: 'Labor Day',
      date: new Date('2025-09-01'), // First Monday in September 2025
      isRecurring: true,
    },
    {
      name: 'Thanksgiving',
      date: new Date('2025-11-27'), // 4th Thursday in November 2025
      isRecurring: true,
    },
    {
      name: 'Christmas Day',
      date: new Date('2025-12-25'),
      isRecurring: true,
    },
  ];

  for (const holiday of federalHolidays) {
    await prisma.holiday.upsert({
      where: {
        // Composite unique check (we'll use name + year for now)
        // Since we don't have a unique constraint, we'll check if exists first
        id: '', // Will never match, forces create
      },
      update: {},
      create: {
        ...holiday,
        createdById: platformAdmin.id,
      },
    });
  }

  console.log(`Seeded ${federalHolidays.length} federal holidays`);
}

export { seedHolidays };
