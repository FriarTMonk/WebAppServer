import { PrismaClient } from '@prisma/client';
import { TRANSLATIONS } from '@mychristiancounselor/shared';
import { seedHolidays } from './seeds/seed-holidays';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedTranslations() {
  console.log('Seeding Bible translations...');

  // Insert translation metadata
  for (const translation of Object.values(TRANSLATIONS)) {
    await prisma.bibleTranslation.upsert({
      where: { code: translation.code },
      update: {
        name: translation.name,
        fullName: translation.fullName,
        description: translation.description,
        isActive: true,
      },
      create: {
        code: translation.code,
        name: translation.name,
        fullName: translation.fullName,
        description: translation.description,
        isActive: true,
      },
    });
    console.log(`✓ Seeded translation: ${translation.name}`);
  }
}

async function seedVerses() {
  console.log('\nSeeding Bible verses...');
  console.log('Note: Place Bible verse JSON files in packages/api/src/scripture/data/');
  console.log('Expected format documented in packages/api/src/scripture/data/README.md\n');

  // Load Bible verse data from JSON files
  const translations = ['KJV', 'ASV', 'NIV', 'ESV', 'NASB', 'NKJV', 'NLT', 'YLT'];

  for (const translation of translations) {
    const versesFile = `../src/scripture/data/${translation.toLowerCase()}-verses.json`;

    try {
      const verses = require(versesFile);
      console.log(`Found ${verses.length} verses for ${translation}`);

      // Batch insert for performance
      const batchSize = 1000;
      for (let i = 0; i < verses.length; i += batchSize) {
        const batch = verses.slice(i, i + batchSize);

        await prisma.bibleVerse.createMany({
          data: batch.map((v: any) => ({
            translationCode: translation,
            book: v.book,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
            strongs: v.strongs || [], // Include Strong's numbers if present
          })),
          skipDuplicates: true,
        });

        console.log(`  Inserted ${Math.min(i + batchSize, verses.length)}/${verses.length} verses for ${translation}`);
      }

      console.log(`✓ Seeded all verses for ${translation}`);
    } catch (error) {
      console.log(`⚠️  Verse data not found for ${translation}: ${versesFile}`);
      console.log(`   Place ${translation.toLowerCase()}-verses.json in packages/api/src/scripture/data/`);
    }
  }

  console.log('\n📖 Verse seeding complete!');
  console.log('To add verse data:');
  console.log('1. Place translation JSON files in packages/api/src/scripture/data/');
  console.log('   Supported: kjv, asv, niv, esv, nasb, nkjv, nlt, ylt');
  console.log('2. Follow format in packages/api/src/scripture/data/README.md');
  console.log('3. Run: npm run seed');
}

async function seedPlatformOrganization() {
  console.log('\nSeeding platform organization...');

  // Check if platform organization already exists
  const existingOrg = await prisma.organization.findFirst({
    where: { isSystemOrganization: true },
  });

  if (existingOrg) {
    console.log('✓ Platform organization already exists:', existingOrg.name);
    return;
  }

  // Create platform organization "Tuckaho-tech"
  const platformOrg = await prisma.organization.create({
    data: {
      name: 'Tuckaho-tech',
      description: 'Platform Administration Organization',
      licenseType: null,
      licenseStatus: 'active',
      licenseExpiresAt: null,
      maxMembers: 999999, // Unlimited for platform org
      isSystemOrganization: true,
    },
  });

  console.log('✓ Created platform organization:', platformOrg.name);

  // Create system roles for the organization
  const ownerRole = await prisma.organizationRole.create({
    data: {
      organizationId: platformOrg.id,
      name: 'Owner',
      description: 'Organization owner with full administrative privileges',
      isSystemRole: true,
      permissions: JSON.parse(JSON.stringify([
        'org:manage',
        'members:manage',
        'roles:manage',
        'billing:manage',
        'settings:manage',
      ])),
    },
  });

  console.log('✓ Created Owner role for platform organization');

  // Check if platform admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'latuck369@gmail.com' },
  });

  if (existingAdmin) {
    console.log('✓ Platform admin user already exists:', existingAdmin.email);

    // Ensure user is marked as platform admin
    if (!existingAdmin.isPlatformAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { isPlatformAdmin: true },
      });
      console.log('✓ Updated user to platform admin status');
    }

    // Ensure user is member of platform org
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: platformOrg.id,
          userId: existingAdmin.id,
        },
      },
    });

    if (!membership) {
      await prisma.organizationMember.create({
        data: {
          organizationId: platformOrg.id,
          userId: existingAdmin.id,
          roleId: ownerRole.id,
        },
      });
      console.log('✓ Added platform admin to organization');
    }

    return;
  }

  // Create platform admin user
  // Default password: "ChangeMe123!" - MUST be changed on first login
  const defaultPassword = 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const platformAdmin = await prisma.user.create({
    data: {
      email: 'latuck369@gmail.com',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      emailVerified: true, // Pre-verified for platform admin
      isPlatformAdmin: true,
      accountType: 'organization',
      isActive: true,
    },
  });

  console.log('✓ Created platform admin user:', platformAdmin.email);
  console.log('  ⚠️  Default password: "ChangeMe123!" - CHANGE ON FIRST LOGIN!');

  // Add admin to platform organization
  await prisma.organizationMember.create({
    data: {
      organizationId: platformOrg.id,
      userId: platformAdmin.id,
      roleId: ownerRole.id,
    },
  });

  console.log('✓ Added platform admin to organization');
  console.log('✓ Platform organization setup complete');
}

async function main() {
  console.log('Starting database seed...\n');

  try {
    // MUST run first - creates platform organization and admin user
    await seedPlatformOrganization();

    await seedTranslations();
    await seedVerses();
    await seedHolidays();

    console.log('\n✅ Database seeding completed!');
    console.log('\n📋 Platform Admin Credentials:');
    console.log('   Email: latuck369@gmail.com');
    console.log('   Default Password: ChangeMe123!');
    console.log('   ⚠️  IMPORTANT: Change this password immediately after first login!\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
