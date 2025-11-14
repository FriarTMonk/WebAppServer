import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedRemainingTranslations() {
  const translations = ['NLT', 'YLT'];

  for (const translation of translations) {
    const filePath = path.join(__dirname, `${translation.toLowerCase()}-verses.json`);

    console.log(`\nProcessing ${translation}...`);
    console.log(`Reading: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const verses = JSON.parse(fileContent);

    console.log(`Found ${verses.length} verses for ${translation}`);

    // First, ensure translation metadata exists
    await prisma.bibleTranslation.upsert({
      where: { code: translation },
      update: { isActive: true },
      create: {
        code: translation,
        name: translation,
        fullName: translation === 'NLT' ? 'New Living Translation' : "Young's Literal Translation",
        description: translation === 'NLT'
          ? 'Highly readable translation emphasizing clear, natural English'
          : 'Extremely literal translation preserving original word order and tense',
        isActive: true,
      },
    });

    // Batch insert verses
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
          strongs: v.strongs || [],
        })),
        skipDuplicates: true,
      });

      console.log(`  Inserted ${Math.min(i + batchSize, verses.length)}/${verses.length} verses for ${translation}`);
    }

    console.log(`✓ Seeded all verses for ${translation}`);
  }
}

async function main() {
  console.log('Seeding remaining translations (NLT, YLT)...\n');

  try {
    await seedRemainingTranslations();
    console.log('\n✅ Successfully seeded remaining translations!');
  } catch (error) {
    console.error('❌ Error:', error);
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
