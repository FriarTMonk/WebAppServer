const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://app_mychristiancounselor:apP_mycC!@mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com/mychristiancounselor?sslmode=require"
});

async function compareTables() {
  try {
    // Get tables from production database
    const result = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    const prodTables = result.map(r => r.tablename);
    
    // Get models from Prisma schema
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const modelMatches = schemaContent.match(/^model\s+(\w+)\s*\{/gm);
    const schemaModels = modelMatches.map(m => {
      const match = m.match(/model\s+(\w+)/);
      return match[1];
    });
    
    console.log('=== PRODUCTION DATABASE TABLES ===');
    console.log(`Total: ${prodTables.length} tables`);
    prodTables.forEach(t => console.log(`  ✓ ${t}`));
    
    console.log('\n=== PRISMA SCHEMA MODELS ===');
    console.log(`Total: ${schemaModels.length} models`);
    schemaModels.forEach(m => console.log(`  - ${m}`));
    
    console.log('\n=== MISSING TABLES (in schema but not in database) ===');
    const missing = schemaModels.filter(m => !prodTables.includes(m));
    console.log(`Total: ${missing.length} missing tables`);
    missing.forEach(m => console.log(`  ❌ ${m}`));
    
    console.log('\n=== EXTRA TABLES (in database but not in schema) ===');
    const extra = prodTables.filter(t => !schemaModels.includes(t) && !t.startsWith('_'));
    console.log(`Total: ${extra.length} extra tables`);
    extra.forEach(t => console.log(`  ⚠️  ${t}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareTables();
