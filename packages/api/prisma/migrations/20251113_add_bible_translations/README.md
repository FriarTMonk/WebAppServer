# Migration: Add Bible Translations

**Created**: 2025-11-13
**Purpose**: Add support for multiple Bible translations (NIV, NASB, NKJV, ESV)

## Changes

1. **Session Table**:
   - Added `preferredTranslation` column (TEXT, default 'NIV')

2. **New Tables**:
   - `BibleTranslation`: Metadata for available Bible translations
   - `BibleVerse`: Individual verses across all translations (~124,000 verses)

3. **Indexes**:
   - Optimized for verse lookups by translation, book, chapter, and verse
   - Unique constraint ensures no duplicate verses per translation

## To Run This Migration

### When Database is Available:

```bash
cd /mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/packages/api
npx prisma migrate deploy
```

### Or Manually:

```bash
psql -h 192.168.1.220 -U postgres -d mychristiancounselor -f migration.sql
```

### After Migration:

1. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

2. Run seed script to populate translations:
   ```bash
   npm run seed
   ```

## Database Status

- **Current Status**: Database at 192.168.1.220:5432 is not reachable
- **Schema Updated**: ✅ Yes (prisma/schema.prisma)
- **Migration File Created**: ✅ Yes (this directory)
- **Migration Applied**: ❌ Pending database availability

## Next Steps

1. Ensure PostgreSQL database is running
2. Run migration (see commands above)
3. Populate Bible verses using seed script
4. Test with all 4 translations
