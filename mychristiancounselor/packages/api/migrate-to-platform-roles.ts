import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';
const PLATFORM_ROLE_NAMES = ['Owner', 'Admin', 'Counselor', 'Member'];

async function main() {
  console.log('='.repeat(60));
  console.log('MIGRATING ORGANIZATIONS TO PLATFORM ROLES');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Get all platform roles
  console.log('Step 1: Loading platform roles from System Organization...');
  const platformRoles = await prisma.organizationRole.findMany({
    where: {
      organizationId: SYSTEM_ORG_ID,
      name: { in: PLATFORM_ROLE_NAMES },
    },
  });

  if (platformRoles.length !== PLATFORM_ROLE_NAMES.length) {
    throw new Error(
      `Missing platform roles! Expected ${PLATFORM_ROLE_NAMES.length}, found ${platformRoles.length}. ` +
        'Run ensure-platform-roles.ts first.'
    );
  }

  const platformRoleMap = new Map(platformRoles.map((r) => [r.name, r.id]));
  console.log(`✓ Loaded ${platformRoles.length} platform roles\n`);

  // Step 2: Get all organizations except System Org
  console.log('Step 2: Finding organizations to migrate...');
  const organizations = await prisma.organization.findMany({
    where: {
      id: { not: SYSTEM_ORG_ID },
    },
    include: {
      roles: {
        where: {
          name: { in: PLATFORM_ROLE_NAMES },
        },
      },
      members: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log(`✓ Found ${organizations.length} organizations to check\n`);

  // Step 3: Migrate each organization
  let totalUpdated = 0;
  let totalDeleted = 0;

  for (const org of organizations) {
    console.log(`\nProcessing: ${org.name} (${org.id})`);
    console.log('-'.repeat(60));

    const duplicateRoles = org.roles;
    if (duplicateRoles.length === 0) {
      console.log('  ✓ Already using platform roles');
      continue;
    }

    console.log(`  Found ${duplicateRoles.length} duplicate role(s)`);

    // For each duplicate role, update members to use platform role
    for (const dupRole of duplicateRoles) {
      const platformRoleId = platformRoleMap.get(dupRole.name);
      if (!platformRoleId) {
        console.log(`  ⚠ Skipping unknown role: ${dupRole.name}`);
        continue;
      }

      // Find members using this duplicate role
      const membersWithDupRole = org.members.filter(
        (m) => m.roleId === dupRole.id
      );

      if (membersWithDupRole.length > 0) {
        console.log(`  Migrating ${membersWithDupRole.length} member(s) from "${dupRole.name}" to platform role...`);

        // Update all members to use platform role
        const updateResult = await prisma.organizationMember.updateMany({
          where: {
            roleId: dupRole.id,
          },
          data: {
            roleId: platformRoleId,
          },
        });

        totalUpdated += updateResult.count;
        console.log(`    ✓ Updated ${updateResult.count} member(s)`);
      }

      // Delete the duplicate role
      await prisma.organizationRole.delete({
        where: { id: dupRole.id },
      });
      totalDeleted++;
      console.log(`    ✓ Deleted duplicate "${dupRole.name}" role`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Organizations processed: ${organizations.length}`);
  console.log(`Member records updated: ${totalUpdated}`);
  console.log(`Duplicate roles deleted: ${totalDeleted}`);
  console.log();
  console.log('✓ All organizations now use shared platform roles!');
  console.log();

  // Verify no duplicate roles remain
  const remainingDuplicates = await prisma.organizationRole.count({
    where: {
      organizationId: { not: SYSTEM_ORG_ID },
      name: { in: PLATFORM_ROLE_NAMES },
    },
  });

  if (remainingDuplicates > 0) {
    console.warn(`⚠ WARNING: ${remainingDuplicates} duplicate role(s) still exist!`);
  } else {
    console.log('✓ Verification: No duplicate roles remaining');
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Migration failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
