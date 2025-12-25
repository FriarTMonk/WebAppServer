# Prisma Schema Safe Update Process

## CRITICAL RULE: NEVER DROP PRODUCTION TABLES

**NEVER use `prisma db push` in production or on any database with data!**

`prisma db push` is DANGEROUS because:
- It syncs schema → database (drops anything not in schema)
- No migration history or rollback capability
- No review step before changes are applied
- Can result in data loss

---

## Safe Process for Schema Updates

### Step 1: Ensure Schema Matches Database

**Always start by pulling current database state:**
```bash
npx prisma db pull
```

This introspects the database and updates the schema to match what's ACTUALLY in the database.

### Step 2: Make Your Schema Changes

Edit `prisma/schema.prisma` to add:
- New models
- New fields
- New indexes
- Relationship changes

**NEVER remove models or fields from production schemas without explicit approval!**

### Step 3: Create Migration File (Without Applying)

```bash
npx prisma migrate dev --name your-descriptive-name --create-only
```

This creates a migration file in `prisma/migrations/` WITHOUT applying it.

### Step 4: REVIEW THE GENERATED SQL

**CRITICAL:** Open the migration file and review the SQL:

```bash
cat prisma/migrations/YYYYMMDDHHMMSS_your-descriptive-name/migration.sql
```

**Check for:**
- ✅ CREATE TABLE statements (safe)
- ✅ ALTER TABLE ADD COLUMN statements (safe)
- ✅ CREATE INDEX statements (safe)
- ❌ DROP TABLE statements (DANGEROUS - requires approval)
- ❌ DROP COLUMN statements (DANGEROUS - requires approval)
- ⚠️  ALTER COLUMN statements (review carefully - may cause data loss)

### Step 5: Apply Migration (Only if Safe)

**Development:**
```bash
npx prisma migrate dev
```

**Production:**
```bash
npx prisma migrate deploy
```

---

## When You Can Use `prisma db push`

**ONLY use `prisma db push` when:**
1. Working on a completely fresh/empty database
2. Local development with throwaway data
3. You explicitly want to reset and lose all data

**NEVER use it when:**
- Database contains any production data
- Database contains any data you want to keep
- You're unsure what changes will be applied

---

## Emergency: Accidentally Dropped Tables

If tables were accidentally dropped:

1. **Stop immediately** - Don't make more changes
2. **Check backups** - Restore from most recent backup if available
3. **Review git history** - Find the last good schema state
4. **Restore schema** - Use `git checkout` to restore previous schema
5. **Recreate tables** - Create migration to add back dropped tables
6. **Report incident** - Document what happened and how to prevent it

---

## Migration Naming Conventions

Use descriptive names that explain what the migration does:

- ✅ `add-book-models`
- ✅ `add-user-birthdate-field`
- ✅ `create-reading-list-table`
- ❌ `update-schema`
- ❌ `changes`
- ❌ `fix`

---

## Pre-Deployment Checklist

Before deploying any migration to production:

- [ ] Schema changes reviewed and approved
- [ ] Migration file reviewed for DROP statements
- [ ] Migration tested on staging/development database
- [ ] Backup of production database created
- [ ] Rollback plan documented
- [ ] Team notified of schema changes

---

## Documentation Updated

**Date:** 2025-12-25
**By:** Claude Code
**Reason:** Prevented future table drops after incident where `prisma db push` dropped 2 tables (ExternalOrganization, UserReadingList)
