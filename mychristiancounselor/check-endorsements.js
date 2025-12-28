const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.book.findUnique({
    where: { id: '9506827b-e788-4915-9290-fa5440cd8d46' },
    include: {
      endorsements: {
        include: {
          organization: { select: { name: true } }
        }
      }
    }
  }),
  prisma.user.findMany({
    where: {
      OR: [
        { id: '447d7808-c475-4483-806e-47005b07bb0d' },
        { id: '598cac8e-256d-4ca4-afa2-f85fa2ea7d9c' }
      ]
    },
    include: {
      organizationMemberships: {
        include: {
          organization: { select: { name: true } }
        }
      }
    }
  })
])
  .then(([book, users]) => {
    console.log('\n=== BOOK INFO ===');
    console.log('Title:', book.title);
    console.log('Submitted by org:', book.submittedByOrganizationId);
    console.log('Visibility:', book.visibilityTier);
    console.log('Status:', book.evaluationStatus);
    console.log('Genre:', book.genreTag);
    console.log('\nEndorsing Organizations:');
    book.endorsements.forEach(e => {
      console.log('  -', e.organization.name, `(${e.organizationId})`);
    });
    
    console.log('\n=== USERS ===');
    users.forEach(u => {
      console.log('\nEmail:', u.email);
      console.log('Platform Admin:', u.isPlatformAdmin);
      console.log('Organizations:');
      u.organizationMemberships.forEach(m => {
        console.log('  -', m.organization.name, `(${m.organizationId})`);
      });
    });
    console.log('');
    
    prisma.$disconnect();
  })
  .catch(err => {
    console.error('Error:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
