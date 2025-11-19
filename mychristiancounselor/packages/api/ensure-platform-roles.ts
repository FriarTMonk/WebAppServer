import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Ensuring platform roles exist in System Organization...\n');

  // Define the platform roles that should exist
  const platformRoles = [
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
      name: 'Admin',
      description: 'Can manage members and roles',
      permissions: [
        'VIEW_ORGANIZATION',
        'MANAGE_MEMBERS',
        'INVITE_MEMBERS',
        'REMOVE_MEMBERS',
        'VIEW_MEMBERS',
        'ASSIGN_ROLES',
        'VIEW_MEMBER_CONVERSATIONS',
        'VIEW_ANALYTICS',
        'EXPORT_DATA',
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

  // Ensure System Organization exists
  let systemOrg = await prisma.organization.findUnique({
    where: { id: SYSTEM_ORG_ID },
  });

  if (!systemOrg) {
    console.log('Creating System Organization...');
    systemOrg = await prisma.organization.create({
      data: {
        id: SYSTEM_ORG_ID,
        name: 'Platform Administration',
        description: 'System organization for platform-wide role definitions',
        isSystemOrganization: true,
        licenseStatus: 'active',
        maxMembers: 999999,
      },
    });
    console.log('✓ Created System Organization\n');
  }

  for (const roleData of platformRoles) {
    // Check if role already exists
    const existing = await prisma.organizationRole.findUnique({
      where: {
        organizationId_name: {
          organizationId: SYSTEM_ORG_ID,
          name: roleData.name,
        },
      },
    });

    if (existing) {
      // Update permissions if they've changed
      const existingPerms = Array.isArray(existing.permissions)
        ? existing.permissions
        : JSON.parse(existing.permissions as string);

      const permsChanged =
        existingPerms.length !== roleData.permissions.length ||
        !roleData.permissions.every((p) => existingPerms.includes(p));

      if (permsChanged) {
        await prisma.organizationRole.update({
          where: { id: existing.id },
          data: {
            permissions: roleData.permissions,
            description: roleData.description,
          },
        });
        console.log(`✓ Updated role "${roleData.name}" with latest permissions`);
      } else {
        console.log(`✓ Role "${roleData.name}" already exists with correct permissions`);
      }
    } else {
      // Create the role
      const role = await prisma.organizationRole.create({
        data: {
          organizationId: SYSTEM_ORG_ID,
          name: roleData.name,
          description: roleData.description,
          isSystemRole: true,
          permissions: roleData.permissions,
        },
      });
      console.log(`✓ Created platform role "${roleData.name}" (${role.id})`);
    }
  }

  // Display all platform roles
  console.log('\nPlatform roles in System Organization:');
  const allRoles = await prisma.organizationRole.findMany({
    where: { organizationId: SYSTEM_ORG_ID },
    orderBy: { name: 'asc' },
  });

  allRoles.forEach((role) => {
    const perms = Array.isArray(role.permissions)
      ? role.permissions
      : JSON.parse(role.permissions as string);
    console.log(`  - ${role.name} (${role.id})`);
    console.log(`    Permissions: ${perms.length} total`);
  });

  console.log('\nDone! Platform roles are ready.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
