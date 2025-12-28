const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPurchaseLinks() {
  const book = await prisma.book.findFirst({
    where: { title: { contains: 'This Present Darkness' } },
    include: {
      purchaseLinks: true
    }
  });

  console.log('Book:', book.title);
  console.log('Purchase Links Count:', book.purchaseLinks.length);
  console.log('Purchase Links:', JSON.stringify(book.purchaseLinks, null, 2));

  await prisma.$disconnect();
}

checkPurchaseLinks().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
