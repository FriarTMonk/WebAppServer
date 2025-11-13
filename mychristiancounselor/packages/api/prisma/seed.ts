import { PrismaClient } from '@prisma/client';
import { TRANSLATIONS } from '@mychristiancounselor/shared';

const prisma = new PrismaClient();

async function seedTranslations() {
  console.log('Seeding Bible translations...');

  // Insert translation metadata
  for (const translation of Object.values(TRANSLATIONS)) {
    await prisma.bibleTranslation.upsert({
      where: { code: translation.code },
      update: {
        name: translation.name,
        fullName: translation.fullName,
        description: translation.description,
        isActive: true,
      },
      create: {
        code: translation.code,
        name: translation.name,
        fullName: translation.fullName,
        description: translation.description,
        isActive: true,
      },
    });
    console.log(`✓ Seeded translation: ${translation.name}`);
  }
}

async function seedVerses() {
  console.log('\nSeeding Bible verses...');
  console.log('Note: This is a placeholder. Bible verse data needs to be acquired separately.');
  console.log('Expected data format for each translation:');
  console.log(`
  Example structure:
  {
    "book": "John",
    "chapter": 3,
    "verse": 16,
    "text": "For God so loved the world...",
    "translation": "NIV"
  }
  `);

  // TODO: Load Bible verse data from JSON files
  // Example implementation:
  /*
  const translations = ['NIV', 'NASB', 'NKJV', 'ESV'];

  for (const translation of translations) {
    const versesFile = `./data/${translation.toLowerCase()}-verses.json`;

    try {
      const verses = require(versesFile);

      // Batch insert for performance
      const batchSize = 1000;
      for (let i = 0; i < verses.length; i += batchSize) {
        const batch = verses.slice(i, i + batchSize);

        await prisma.bibleVerse.createMany({
          data: batch.map((v: any) => ({
            translationCode: translation,
            book: v.book,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
          })),
          skipDuplicates: true,
        });

        console.log(`  Inserted ${Math.min(i + batchSize, verses.length)}/${verses.length} verses for ${translation}`);
      }

      console.log(`✓ Seeded all verses for ${translation}`);
    } catch (error) {
      console.log(`✗ Verse data not found for ${translation}: ${versesFile}`);
    }
  }
  */

  console.log('\n⚠️  To complete verse seeding:');
  console.log('1. Acquire Bible text data for NIV, NASB, NKJV, ESV');
  console.log('2. Convert to JSON format matching structure above');
  console.log('3. Place files in: packages/api/src/scripture/data/');
  console.log('4. Uncomment and adapt the verse loading code above');
  console.log('5. Run: npm run seed');
}

async function main() {
  console.log('Starting database seed...\n');

  try {
    await seedTranslations();
    await seedVerses();

    console.log('\n✅ Database seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
