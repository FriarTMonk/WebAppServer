const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://app_mychristiancounselor:apP_mycC!@192.168.1.220/mychristiancounselor" }}
});

async function test() {
  const verse = await prisma.bibleVerse.findFirst({
    where: { translationCode: 'KJV', book: 'Genesis', chapter: 1, verse: 1 }
  });
  console.log('Full verse object:');
  console.log(JSON.stringify(verse, null, 2));
  console.log('\nStrongs field specifically:');
  console.log(verse.strongs);
}

test().finally(() => prisma.$disconnect());
