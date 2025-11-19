import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding missing roles to Platform Administration organization...\n');

  const platformOrgId = '00000000-0000-0000-0000-000000000001';

  // Define the roles that should exist
  const rolesToAdd = [
    {
      name: 'Owner',
      description: 'Full access to manage organization',
      permissions: [
        'MANAGE_ORGANIZATION',
        'MANAGE_MEMBERS',
        'INVITE_MEMBERS',
        'REMOVE_MEMBERS',
        'VIEW_MEMBERS',
        'MANAGE_ROLES',
        'ASSIGN_ROLES',
        'VIEW_MEMBER_CONVERSATIONS',
        'VIEW_ANALYTICS',
        'EXPORT_DATA',
        'MANAGE_BILLING',
        'VIEW_BILLING',
      ],
    },
    {
      name: 'Counselor',
      description: 'Can view member conversations and analytics',
      permissions: [
        'VIEW_ORGANIZATION',
        'VIEW_MEMBERS',
        'VIEW_MEMBER_CONVERSATIONS',
        'VIEW_ANALYTICS',
      ],
    },
    {
      name: 'Member',
      description: 'Basic member access',
      permissions: [
        'VIEW_ORGANIZATION',
      ],
    },
  ];

  for (const roleData of rolesToAdd) {
    // Check if role already exists
    const existing = await prisma.organizationRole.findFirst({
      where: {
        organizationId: platformOrgId,
        name: roleData.name,
      },
    });

    if (existing) {
      console.log(`✓ Role "${roleData.name}" already exists`);
      continue;
    }

    // Create the role
    const role = await prisma.organizationRole.create({
      data: {
        organizationId: platformOrgId,
        name: roleData.name,
        description: roleData.description,
        isSystemRole: true,
        permissions: roleData.permissions,
      },
    });

    console.log(`✓ Created role "${roleData.name}" (${role.id})`);
  }

  // Display all roles in the organization
  console.log('\nAll roles in Platform Administration:');
  const allRoles = await prisma.organizationRole.findMany({
    where: { organizationId: platformOrgId },
    orderBy: { name: 'asc' },
  });

  allRoles.forEach(role => {
    console.log(`  - ${role.name} (${role.id})`);
  });

  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
