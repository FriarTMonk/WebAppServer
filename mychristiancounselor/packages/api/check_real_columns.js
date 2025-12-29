const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasourceUrl: "postgresql://app_mychristiancounselor:apP_mycC!@mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com/mychristiancounselor?sslmode=require"
});

async function checkMissingColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    
    const prodColumns = {};
    result.forEach(r => {
      if (!prodColumns[r.table_name]) prodColumns[r.table_name] = [];
      prodColumns[r.table_name].push(r.column_name);
    });
    
    // Parse schema for actual columns (not relations)
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    const schemaModels = {};
    
    let match;
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const lines = modelBody.split('\n');
      schemaModels[modelName] = [];
      
      for (const line of lines) {
        // Skip relations (lines with @relation)
        if (line.includes('@relation')) continue;
        // Match actual field definitions
        const fieldMatch = line.match(/^\s*(\w+)\s+[\w\[\]?]+/);
        if (fieldMatch && !line.trim().startsWith('//') && !line.trim().startsWith('@@')) {
          schemaModels[modelName].push(fieldMatch[1]);
        }
      }
    }
    
    console.log('=== CHECKING FOR MISSING DATABASE COLUMNS ===\n');
    
    let totalMissing = 0;
    for (const [modelName, schemaFields] of Object.entries(schemaModels)) {
      const prodFields = prodColumns[modelName] || [];
      const missing = schemaFields.filter(f => !prodFields.includes(f));
      
      if (missing.length > 0) {
        console.log(`❌ ${modelName} - Missing ${missing.length} column(s):`);
        missing.forEach(f => console.log(`   - ${f}`));
        console.log('');
        totalMissing += missing.length;
      }
    }
    
    if (totalMissing === 0) {
      console.log('✅ All database columns are present!');
    } else {
      console.log(`⚠️  Total: ${totalMissing} missing database columns`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingColumns();
