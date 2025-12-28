const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.book.findUnique({
  where: { id: '9506827b-e788-4915-9290-fa5440cd8d46' },
  select: {
    title: true,
    author: true,
    genreTag: true,
    biblicalAlignmentScore: true,
    evaluationStatus: true,
    visibilityTier: true,
    aiModel: true,
    scoringReasoning: true
  }
})
  .then(book => {
    if (!book) {
      console.log('Book not found');
      prisma.$disconnect();
      return;
    }
    console.log('\n========== FINAL FICTION-AWARE EVALUATION ==========\n');
    console.log('Title:', book.title);
    console.log('Author:', book.author);
    console.log('Genre:', book.genreTag);
    console.log('Score:', (book.biblicalAlignmentScore || 0) + '%');
    console.log('Status:', book.evaluationStatus);
    console.log('Visibility:', book.visibilityTier);
    console.log('Model:', book.aiModel);
    console.log('\nReasoning:');
    console.log(book.scoringReasoning || 'No reasoning available');
    console.log('\n====================================================\n');
    
    const score = book.biblicalAlignmentScore || 0;
    if (score >= 90) {
      console.log('SUCCESS! Book is now Globally Aligned (>= 90%)');
    } else if (score >= 70) {
      console.log('Book is Conceptually Aligned (70-89%)');
    } else {
      console.log('Book is Not Aligned (<70%)');
    }
    console.log('');
    
    prisma.$disconnect();
  })
  .catch(err => {
    console.error('Error:', err.message);
    prisma.$disconnect();
    process.exit(1);
  });
