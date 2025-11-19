import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHolidays() {
  console.log('Seeding federal holidays...');

  try {
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

    let upsertedCount = 0;
    let skippedCount = 0;

    for (const holiday of federalHolidays) {
      try {
        await prisma.holiday.upsert({
          where: {
            // Use the unique constraint on name and date
            name_date: {
              name: holiday.name,
              date: holiday.date,
            },
          },
          update: {
            // Update isRecurring if it changed
            isRecurring: holiday.isRecurring,
          },
          create: {
            ...holiday,
            createdById: platformAdmin.id,
          },
        });
        upsertedCount++;
      } catch (error) {
        console.error(`Failed to upsert holiday ${holiday.name}:`, error);
        skippedCount++;
      }
    }

    console.log(
      `Seeded ${upsertedCount} federal holidays (${skippedCount} skipped due to errors)`
    );
  } catch (error) {
    console.error('Error seeding holidays:', error);
    throw error;
  }
}

export { seedHolidays };
