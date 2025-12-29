import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBooks() {
  console.log('🔄 Connecting to database...');

  const books = await prisma.book.findMany({
    select: {
      id: true,
      title: true,
      author: true,
      evaluationStatus: true,
      biblicalAlignmentScore: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`\n📚 Total books in database: ${books.length}\n`);

  books.forEach((book, index) => {
    console.log(`${index + 1}. "${book.title}" by ${book.author}`);
    console.log(`   ID: ${book.id}`);
    console.log(`   Status: ${book.evaluationStatus}`);
    console.log(`   Score: ${book.biblicalAlignmentScore || 'N/A'}`);
    console.log(`   Created: ${book.createdAt.toISOString()}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkBooks().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
