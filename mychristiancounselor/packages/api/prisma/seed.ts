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
  console.log('Note: Place Bible verse JSON files in packages/api/src/scripture/data/');
  console.log('Expected format documented in packages/api/src/scripture/data/README.md\n');

  // Load Bible verse data from JSON files
  const translations = ['KJV', 'ASV', 'NIV', 'ESV', 'NASB', 'NKJV', 'NLT', 'YLT'];

  for (const translation of translations) {
    const versesFile = `../src/scripture/data/${translation.toLowerCase()}-verses.json`;

    try {
      const verses = require(versesFile);
      console.log(`Found ${verses.length} verses for ${translation}`);

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
            strongs: v.strongs || [], // Include Strong's numbers if present
          })),
          skipDuplicates: true,
        });

        console.log(`  Inserted ${Math.min(i + batchSize, verses.length)}/${verses.length} verses for ${translation}`);
      }

      console.log(`✓ Seeded all verses for ${translation}`);
    } catch (error) {
      console.log(`⚠️  Verse data not found for ${translation}: ${versesFile}`);
      console.log(`   Place ${translation.toLowerCase()}-verses.json in packages/api/src/scripture/data/`);
    }
  }

  console.log('\n📖 Verse seeding complete!');
  console.log('To add verse data:');
  console.log('1. Place translation JSON files in packages/api/src/scripture/data/');
  console.log('   Supported: kjv, asv, niv, esv, nasb, nkjv, nlt, ylt');
  console.log('2. Follow format in packages/api/src/scripture/data/README.md');
  console.log('3. Run: npm run seed');
}

// Platform Admin organization is no longer needed
// Platform admins are identified by the isPlatformAdmin flag on the User table
// Individual users do not need to be in an organization

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
