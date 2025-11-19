import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Platform Administrator role usage...\n');

  const platformAdminRoleId = '00000000-0000-0000-0000-000000000002';

  // Find all users with this role
  const members = await prisma.organizationMember.findMany({
    where: {
      roleId: platformAdminRoleId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log(`Found ${members.length} user(s) with Platform Administrator role:\n`);

  members.forEach(member => {
    console.log(`  - ${member.user.email} (${member.user.id})`);
  });

  if (members.length > 0) {
    console.log('\n⚠️  Need to migrate these users to a different role before deletion.');
  } else {
    console.log('\n✓ No users have this role - safe to delete.');
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
