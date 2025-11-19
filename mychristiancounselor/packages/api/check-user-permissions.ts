import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking user permissions...\n');

  // Get all organization members with their roles
  const members = await prisma.organizationMember.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      // Exclude system organization members
      organization: {
        isSystemOrganization: false,
      },
    },
  });

  console.log(`Found ${members.length} organization members\n`);

  for (const member of members) {
    console.log('='.repeat(70));
    console.log(`User: ${member.user.email} (${member.user.firstName} ${member.user.lastName})`);
    console.log(`Organization: ${member.organization.name} (${member.organization.id})`);
    console.log(`Role: ${member.role.name} (${member.role.id})`);
    console.log(`Role Organization ID: ${member.role.organizationId}`);

    // Parse permissions
    let permissions = member.role.permissions as any;
    if (typeof permissions === 'string') {
      permissions = JSON.parse(permissions);
    }
    if (!Array.isArray(permissions)) {
      permissions = [];
    }

    console.log(`Permissions (${permissions.length}):`);
    permissions.forEach((perm: string) => {
      console.log(`  - ${perm}`);
    });

    // Check for INVITE_MEMBERS specifically
    const hasInviteMembers = permissions.includes('INVITE_MEMBERS');
    console.log(`\nHas INVITE_MEMBERS: ${hasInviteMembers ? '✓ YES' : '✗ NO'}`);
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
