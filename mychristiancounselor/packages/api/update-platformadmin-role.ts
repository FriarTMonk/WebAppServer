import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating platformadmin@test.com role to Admin...\n');

  const userId = '1f9c63e4-fc52-4000-b824-a319a4f028a7';
  const organizationId = '00000000-0000-0000-0000-000000000001'; // Platform Administration
  const newRoleId = '06d8c5dd-cd46-47fd-bdae-5c23556f38e8'; // Admin role

  // Find the membership
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
    },
    include: {
      role: true,
    },
  });

  if (!membership) {
    console.log('Membership not found!');
    return;
  }

  console.log('Current membership:', {
    id: membership.id,
    currentRole: membership.role.name,
    currentRoleId: membership.roleId,
  });

  // Update the role
  const updated = await prisma.organizationMember.update({
    where: { id: membership.id },
    data: { roleId: newRoleId },
    include: {
      role: true,
    },
  });

  console.log('\nUpdated membership:', {
    id: updated.id,
    newRole: updated.role.name,
    newRoleId: updated.roleId,
  });

  console.log('\n✓ Role updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
