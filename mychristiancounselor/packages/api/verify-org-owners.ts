import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Verifying all organizations have owners...\n');

  // Get all non-system organizations
  const organizations = await prisma.organization.findMany({
    where: {
      id: { not: SYSTEM_ORG_ID },
    },
    include: {
      members: {
        include: {
          role: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${organizations.length} organization(s)\n`);

  let orgsWithoutOwners = 0;

  for (const org of organizations) {
    const owners = org.members.filter(
      (m) => m.role.name === 'Owner'
    );
    const admins = org.members.filter(
      (m) => m.role.name === 'Admin'
    );

    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(`  Owners: ${owners.length}`);
    console.log(`  Admins: ${admins.length}`);
    console.log(`  Total Members: ${org.members.length}`);

    if (owners.length === 0) {
      console.log(`  ⚠️  WARNING: No owners!`);
      orgsWithoutOwners++;

      if (admins.length > 0) {
        console.log(`     Admins who could be promoted:`);
        admins.forEach((a) => {
          console.log(`     - ${a.user.email} (${a.user.firstName} ${a.user.lastName})`);
        });
      }
    } else {
      owners.forEach((o) => {
        console.log(`     Owner: ${o.user.email}`);
      });
    }
    console.log();
  }

  if (orgsWithoutOwners > 0) {
    console.log(`\n❌ Found ${orgsWithoutOwners} organization(s) without owners!`);
    process.exit(1);
  } else {
    console.log('\n✅ All organizations have at least one owner!');
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
