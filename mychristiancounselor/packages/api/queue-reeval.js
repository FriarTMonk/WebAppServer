const { Queue } = require('bullmq');

const queue = new Queue('book-evaluation', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10) || 0
  }
});

console.log('Queueing re-evaluation job for book 9506827b-e788-4915-9290-fa5440cd8d46...');

queue.add('evaluate-book', { bookId: '9506827b-e788-4915-9290-fa5440cd8d46' }, {
  priority: 1,
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }
})
  .then(job => {
    console.log('\n✓ Re-evaluation job queued successfully!');
    console.log('  Job ID:', job.id);
    console.log('  Book ID:', job.data.bookId);
    console.log('\nThe evaluation will process in the background.');
    console.log('The book should be re-evaluated with fiction-aware criteria shortly.\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Error queueing job:', err.message);
    process.exit(1);
  });
