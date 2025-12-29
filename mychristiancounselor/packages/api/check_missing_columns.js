const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://app_mychristiancounselor:apP_mycC!@mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com/mychristiancounselor?sslmode=require"
});

async function checkMissingColumns() {
  try {
    // Get all columns from production database
    const result = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    
    const prodColumns = {};
    result.forEach(r => {
      if (!prodColumns[r.table_name]) prodColumns[r.table_name] = [];
      prodColumns[r.table_name].push(r.column_name);
    });
    
    // Parse Prisma schema to get expected columns
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    const schemaModels = {};
    
    let match;
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const fieldMatches = modelBody.matchAll(/^\s*(\w+)\s+/gm);
      schemaModels[modelName] = [];
      for (const fieldMatch of fieldMatches) {
        schemaModels[modelName].push(fieldMatch[1]);
      }
    }
    
    console.log('=== CHECKING FOR MISSING COLUMNS ===\n');
    
    let totalMissing = 0;
    for (const [modelName, schemaFields] of Object.entries(schemaModels)) {
      const prodFields = prodColumns[modelName] || [];
      const missing = schemaFields.filter(f => !prodFields.includes(f));
      
      if (missing.length > 0) {
        console.log(`❌ ${modelName} - Missing ${missing.length} column(s):`);
        missing.forEach(f => console.log(`   - ${f}`));
        totalMissing += missing.length;
      }
    }
    
    if (totalMissing === 0) {
      console.log('✅ All columns are present in production database!');
    } else {
      console.log(`\n⚠️  Total: ${totalMissing} missing columns`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingColumns();
