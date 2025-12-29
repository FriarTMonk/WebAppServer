import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();

async function requeuePendingBooks() {
  console.log('🔄 Connecting to database...');

  // Find all pending books
  const pendingBooks = await prisma.book.findMany({
    where: {
      evaluationStatus: 'pending',
    },
    select: {
      id: true,
      title: true,
      author: true,
      createdAt: true,
    },
  });

  console.log(`📚 Found ${pendingBooks.length} pending book(s)`);

  if (pendingBooks.length === 0) {
    console.log('✅ No pending books to requeue');
    await prisma.$disconnect();
    return;
  }

  // Connect to Redis and create queue
  const evaluationQueue = new Queue('evaluation-queue', {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  console.log('🔌 Connected to Redis');

  // Requeue each book
  for (const book of pendingBooks) {
    console.log(`📖 Requeuing: "${book.title}" by ${book.author} (ID: ${book.id})`);

    await evaluationQueue.add(
      'evaluate-book',
      { bookId: book.id },
      {
        priority: 1, // High priority for manual requeue
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );

    console.log(`   ✓ Job queued for book ${book.id}`);
  }

  await evaluationQueue.close();
  await prisma.$disconnect();

  console.log('✅ All books requeued successfully!');
}

requeuePendingBooks()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
