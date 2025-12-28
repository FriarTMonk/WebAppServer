const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBookDetail() {
  const userId = '598cac8e-256d-4ca4-afa2-f85fa2ea7d9c';
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true }  // ✅ Fixed: now selecting id
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );

  // Find "This Present Darkness" book
  const book = await prisma.book.findFirst({
    where: { title: { contains: 'This Present Darkness' } },
    select: { id: true, title: true }
  });

  if (!book) {
    console.log('Book not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Testing book detail for:', book.title);
  console.log('Book ID:', book.id);

  const response = await fetch(`http://localhost:3697/books/${book.id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('\n=== Book Detail ===');
    console.log('Title:', data.title);
    console.log('Author:', data.author);
    console.log('Genre:', data.genreTag);
    console.log('Visibility:', data.visibilityTier);
    console.log('Biblical Alignment Score:', data.biblicalAlignmentScore);
    console.log('\n=== Endorsements ===');
    console.log('Endorsement Count:', data.endorsementCount);
    console.log('Endorsements:', JSON.stringify(data.endorsements, null, 2));
    console.log('\n=== Purchase Info ===');
    console.log('Purchase URL:', data.purchaseUrl || 'Not set');
    console.log('Purchase Links:', JSON.stringify(data.purchaseLinks, null, 2));
  } else {
    console.log('Error:', await response.text());
  }

  await prisma.$disconnect();
}

testBookDetail().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
