import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking isPlatformAdmin flags...\n');

  // Find all users with isPlatformAdmin = true
  const platformAdmins = await prisma.user.findMany({
    where: {
      isPlatformAdmin: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isPlatformAdmin: true,
    },
  });

  console.log(`Users with isPlatformAdmin = true (${platformAdmins.length}):`);
  platformAdmins.forEach(user => {
    console.log(`  ✓ ${user.email} (${user.id})`);
  });

  // Find all users with organization admin roles
  console.log('\n\nUsers with Admin or Owner roles in organizations:');
  const orgAdmins = await prisma.organizationMember.findMany({
    where: {
      role: {
        name: {
          in: ['Owner', 'Admin'],
        },
      },
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
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  orgAdmins.forEach(member => {
    const platformAdminBadge = member.user.isPlatformAdmin ? ' [PLATFORM ADMIN]' : '';
    console.log(`  - ${member.user.email} → ${member.role.name} in "${member.organization.name}"${platformAdminBadge}`);
  });

  console.log('\n\nSummary:');
  console.log('========');
  console.log(`✓ Platform Admin menu: Shows for ${platformAdmins.length} user(s) with isPlatformAdmin flag`);
  console.log(`✓ Org Admin menu: Shows for ${orgAdmins.length} user(s) with Owner/Admin roles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
