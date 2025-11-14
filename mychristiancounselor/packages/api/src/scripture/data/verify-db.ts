import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== BIBLE TRANSLATIONS IN DATABASE ===\n');

  const translations = await prisma.bibleTranslation.findMany({
    orderBy: { code: 'asc' },
    select: { code: true, name: true, fullName: true, isActive: true }
  });

  let totalVerses = 0;

  for (const t of translations) {
    const count = await prisma.bibleVerse.count({ where: { translationCode: t.code } });
    totalVerses += count;
    const active = t.isActive ? '✅' : '❌';
    console.log(`${active} ${t.code.padEnd(6)} | ${t.fullName.padEnd(40)} | ${count.toLocaleString().padStart(8)} verses`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Total: ${translations.length} translations, ${totalVerses.toLocaleString()} verses`);
  console.log(`${'='.repeat(70)}\n`);

  await prisma.$disconnect();
}

main();
