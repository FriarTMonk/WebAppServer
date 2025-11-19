import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Removing Platform Administration organization...\n');

  const platformOrgId = '00000000-0000-0000-0000-000000000001';

  // Step 1: Find all members
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: platformOrgId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isPlatformAdmin: true,
        },
      },
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`Found ${members.length} member(s) in Platform Administration:`);
  members.forEach(member => {
    const adminBadge = member.user.isPlatformAdmin ? ' [HAS PLATFORM ADMIN FLAG]' : '';
    console.log(`  - ${member.user.email} (${member.role.name})${adminBadge}`);
  });

  // Step 2: Check if any members should have isPlatformAdmin flag
  console.log('\n⚠️  Before deletion, verify these users have correct isPlatformAdmin flags:');
  const needsFlag = members.filter(m => !m.user.isPlatformAdmin);

  if (needsFlag.length > 0) {
    console.log('\n  Users WITHOUT isPlatformAdmin flag:');
    needsFlag.forEach(m => {
      console.log(`    - ${m.user.email} (currently: ${m.role.name})`);
    });
    console.log('\n  If any of these should be platform admins, set their flag first!');
    console.log('  Otherwise, they will become regular individual users.\n');
  } else {
    console.log('  ✓ All members either have isPlatformAdmin flag or will become regular users\n');
  }

  // Step 3: Delete all memberships
  console.log('Deleting organization memberships...');
  const deletedMemberships = await prisma.organizationMember.deleteMany({
    where: {
      organizationId: platformOrgId,
    },
  });
  console.log(`  ✓ Deleted ${deletedMemberships.count} membership(s)`);

  // Step 4: Delete all roles
  console.log('\nDeleting organization roles...');
  const deletedRoles = await prisma.organizationRole.deleteMany({
    where: {
      organizationId: platformOrgId,
    },
  });
  console.log(`  ✓ Deleted ${deletedRoles.count} role(s)`);

  // Step 5: Delete the organization
  console.log('\nDeleting organization...');
  await prisma.organization.delete({
    where: {
      id: platformOrgId,
    },
  });
  console.log('  ✓ Deleted Platform Administration organization');

  // Step 6: Show final user status
  console.log('\n\nFinal user status:');
  console.log('==================');

  for (const member of members) {
    const user = await prisma.user.findUnique({
      where: { id: member.user.id },
      select: {
        email: true,
        isPlatformAdmin: true,
      },
    });

    if (user?.isPlatformAdmin) {
      console.log(`  ✓ ${user.email} → Platform Admin (individual user)`);
    } else {
      console.log(`  ✓ ${user?.email} → Regular individual user`);
    }
  }

  console.log('\n✅ Done! All users are now individual users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
