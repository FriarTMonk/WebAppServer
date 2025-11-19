import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Admin role to all organizations...');

  // Get all organizations
  const organizations = await prisma.organization.findMany();

  for (const org of organizations) {
    // Check if Admin role already exists
    const existingAdmin = await prisma.organizationRole.findFirst({
      where: {
        organizationId: org.id,
        name: 'Admin',
      },
    });

    if (existingAdmin) {
      console.log(`Admin role already exists for organization: ${org.name}`);
      continue;
    }

    // Create Admin role
    await prisma.organizationRole.create({
      data: {
        organizationId: org.id,
        name: 'Admin',
        description: 'Can manage members and roles',
        isSystemRole: true,
        permissions: {
          create: [
            { permission: 'VIEW_ORGANIZATION' },
            { permission: 'MANAGE_MEMBERS' },
            { permission: 'INVITE_MEMBERS' },
            { permission: 'REMOVE_MEMBERS' },
            { permission: 'VIEW_MEMBERS' },
            { permission: 'ASSIGN_ROLES' },
            { permission: 'VIEW_MEMBER_CONVERSATIONS' },
            { permission: 'VIEW_ANALYTICS' },
            { permission: 'EXPORT_DATA' },
            { permission: 'VIEW_BILLING' },
          ],
        },
      },
    });

    console.log(`✓ Added Admin role to organization: ${org.name}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
