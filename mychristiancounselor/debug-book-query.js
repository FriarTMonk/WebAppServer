const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBookQuery() {
  const userId = '598cac8e-256d-4ca4-afa2-f85fa2ea7d9c'; // validnew@test.com

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPlatformAdmin: true,
      organizationMemberships: {
        select: { organizationId: true }
      }
    }
  });

  console.log('\n=== USER INFO ===');
  console.log('Platform Admin:', user.isPlatformAdmin);
  console.log('Organization IDs:', user.organizationMemberships.map(m => m.organizationId));

  // Build WHERE clause like the API does
  const where = {
    AND: [
      { evaluationStatus: 'completed' },
      { visibilityTier: { not: 'not_aligned' } }
    ]
  };

  console.log('\n=== WHERE CLAUSE ===');
  console.log(JSON.stringify(where, null, 2));

  // Query books
  const books = await prisma.book.findMany({
    where,
    include: {
      endorsements: {
        select: { organizationId: true }
      },
      _count: {
        select: { endorsements: true }
      }
    },
    orderBy: [
      { biblicalAlignmentScore: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  console.log('\n=== QUERY RESULTS ===');
  console.log('Total books returned:', books.length);

  books.forEach(book => {
    console.log('\n--- Book ---');
    console.log('Title:', book.title);
    console.log('Visibility:', book.visibilityTier);
    console.log('Status:', book.evaluationStatus);
    console.log('Genre:', book.genreTag);
    console.log('Endorsements:', book.endorsements.map(e => e.organizationId));

    // Check visibility
    const userOrgIds = user.organizationMemberships.map(m => m.organizationId);
    const bookOrgIds = book.endorsements.map(e => e.organizationId);
    const match = userOrgIds.some(id => bookOrgIds.includes(id));

    console.log('Should be visible?',
      book.visibilityTier === 'globally_aligned' ? 'Yes (globally aligned)' :
      book.visibilityTier === 'conceptually_aligned' && match ? 'Yes (org match)' :
      'No'
    );
  });

  await prisma.$disconnect();
}

debugBookQuery().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
