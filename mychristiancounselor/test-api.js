const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function testBooksAPI() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'validnew@test.com' },
      include: {
        organizationMemberships: {
          select: { organizationId: true }
        }
      }
    });
    
    console.log('\n=== Testing Books API ===');
    console.log('User:', user.email);
    console.log('User ID:', user.id);
    console.log('Organizations:', user.organizationMemberships.map(m => m.organizationId));
    
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:3697/books?take=50', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('\n=== API Response ===');
    console.log('Status:', response.status);
    console.log('Total Books:', data.total);
    console.log('Returned Books:', data.books.length);
    
    if (data.books.length > 0) {
      console.log('\nBooks:');
      data.books.forEach(book => {
        const genre = book.genreTag || 'no genre';
        console.log('  - ' + book.title + ' (' + book.visibilityTier + ') - ' + genre);
      });
    } else {
      console.log('\nNO BOOKS RETURNED!');
      
      const book = await prisma.book.findUnique({
        where: { id: '9506827b-e788-4915-9290-fa5440cd8d46' },
        include: {
          endorsements: {
            select: { organizationId: true }
          }
        }
      });
      
      console.log('\n=== Book in Database ===');
      console.log('Title:', book.title);
      console.log('Visibility:', book.visibilityTier);
      console.log('Status:', book.evaluationStatus);
      console.log('Endorsed by orgs:', book.endorsements.map(e => e.organizationId));
      
      const userOrgIds = user.organizationMemberships.map(m => m.organizationId);
      const bookOrgIds = book.endorsements.map(e => e.organizationId);
      const match = userOrgIds.some(id => bookOrgIds.includes(id));
      
      console.log('\n=== Visibility Check ===');
      console.log('User org IDs:', userOrgIds);
      console.log('Book endorsed by:', bookOrgIds);
      console.log('Match found:', match);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testBooksAPI();
