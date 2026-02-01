import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const parables = [
  {
    slug: 'the-forgotten-password',
    title: 'The Parable of the Forgotten Password',
    publishedDate: new Date('2026-01-31'),
    isFeatured: true,
    category: 'Restoration',
    sortOrder: 1,
  },
  {
    slug: 'the-overloaded-backpack',
    title: 'The Parable of the Overloaded Backpack',
    publishedDate: new Date('2026-01-31'),
    isFeatured: false,
    category: 'Worry',
    sortOrder: 2,
  },
  {
    slug: 'the-unread-message',
    title: 'The Parable of the Unread Message',
    publishedDate: new Date('2026-01-31'),
    isFeatured: false,
    category: 'Forgiveness',
    sortOrder: 3,
  },
  {
    slug: 'the-slow-charging-battery',
    title: 'The Parable of the Slow-Charging Battery',
    publishedDate: new Date('2026-01-31'),
    isFeatured: false,
    category: 'Faith',
    sortOrder: 4,
  },
  {
    slug: 'the-busy-gardener',
    title: 'The Parable of the Busy Gardener',
    publishedDate: new Date('2026-01-24'),
    isFeatured: false,
    category: 'Patience',
    sortOrder: 5,
  },
  {
    slug: 'the-broken-lamp',
    title: 'The Parable of the Broken Lamp',
    publishedDate: new Date('2026-01-17'),
    isFeatured: false,
    category: 'Restoration',
    sortOrder: 6,
  },
];

async function main() {
  console.log('Seeding parables...');

  for (const parable of parables) {
    const result = await prisma.parable.upsert({
      where: { slug: parable.slug },
      update: {
        title: parable.title,
        publishedDate: parable.publishedDate,
        isFeatured: parable.isFeatured,
        category: parable.category,
        sortOrder: parable.sortOrder,
      },
      create: parable,
    });
    console.log(`✓ Seeded parable: ${result.title}`);
  }

  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding parables:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
