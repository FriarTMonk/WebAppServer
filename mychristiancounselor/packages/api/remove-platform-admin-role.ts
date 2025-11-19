import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Removing Platform Administrator role...\n');

  const platformAdminRoleId = '00000000-0000-0000-0000-000000000002';
  const platformOrgId = '00000000-0000-0000-0000-000000000001';

  // Step 1: Find the Owner role in Platform Administration
  const ownerRole = await prisma.organizationRole.findFirst({
    where: {
      organizationId: platformOrgId,
      name: 'Owner',
    },
  });

  if (!ownerRole) {
    console.error('❌ Owner role not found in Platform Administration!');
    process.exit(1);
  }

  console.log(`✓ Found Owner role: ${ownerRole.id}`);

  // Step 2: Find all members with Platform Administrator role
  const members = await prisma.organizationMember.findMany({
    where: {
      roleId: platformAdminRoleId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  console.log(`\nFound ${members.length} member(s) to migrate:`);

  // Step 3: Migrate all members to Owner role
  for (const member of members) {
    await prisma.organizationMember.update({
      where: { id: member.id },
      data: { roleId: ownerRole.id },
    });
    console.log(`  ✓ Migrated ${member.user.email} to Owner role`);
  }

  // Step 4: Delete the Platform Administrator role
  await prisma.organizationRole.delete({
    where: { id: platformAdminRoleId },
  });

  console.log(`\n✓ Deleted Platform Administrator role`);

  // Step 5: List remaining roles
  console.log('\nRemaining roles in Platform Administration:');
  const remainingRoles = await prisma.organizationRole.findMany({
    where: { organizationId: platformOrgId },
    orderBy: { name: 'asc' },
  });

  remainingRoles.forEach(role => {
    console.log(`  - ${role.name} (${role.id})`);
  });

  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
