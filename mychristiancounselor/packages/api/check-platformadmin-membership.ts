import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking platformadmin user membership...\n');

  // Find platformadmin user
  const user = await prisma.user.findFirst({
    where: {
      email: {
        contains: 'platformadmin',
      },
    },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', JSON.stringify({
    id: user.id,
    email: user.email,
    isPlatformAdmin: user.isPlatformAdmin,
  }, null, 2));

  // Find all memberships
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: user.id,
    },
    include: {
      organization: true,
      role: true,
    },
  });

  console.log('\nMemberships:', JSON.stringify(memberships.map(m => ({
    membershipId: m.id,
    organizationId: m.organizationId,
    organizationName: m.organization.name,
    roleId: m.roleId,
    roleName: m.role.name,
    roleIsSystemRole: m.role.isSystemRole,
  })), null, 2));

  // Get all available roles for Platform Administration org
  const platformOrg = memberships.find(m => m.organization.name === 'Platform Administration');
  if (platformOrg) {
    const roles = await prisma.organizationRole.findMany({
      where: {
        organizationId: platformOrg.organizationId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('\nAvailable roles in Platform Administration:');
    roles.forEach(role => {
      const isCurrent = role.id === platformOrg.roleId;
      console.log(`  ${isCurrent ? '>>>' : '   '} ${role.name} (${role.id}) - ${role.isSystemRole ? 'System' : 'Custom'}`);
    });
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
