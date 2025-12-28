const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllPurchaseLinks() {
  const books = await prisma.book.findMany({
    include: {
      purchaseLinks: true,
      _count: {
        select: { purchaseLinks: true }
      }
    }
  });

  console.log('=== Books with Purchase Links ===');
  books.forEach(book => {
    if (book.purchaseLinks.length > 0) {
      console.log(`\n${book.title}:`);
      console.log(`  Links: ${book.purchaseLinks.length}`);
      book.purchaseLinks.forEach(link => {
        console.log(`    - ${link.retailer}: ${link.url} ${link.isPrimary ? '(PRIMARY)' : ''}`);
      });
    }
  });

  const totalWithLinks = books.filter(b => b.purchaseLinks.length > 0).length;
  console.log(`\n\nTotal books: ${books.length}`);
  console.log(`Books with purchase links: ${totalWithLinks}`);
  console.log(`Books without purchase links: ${books.length - totalWithLinks}`);

  await prisma.$disconnect();
}

checkAllPurchaseLinks().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
