import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking all platform admin users...\n');

  // Find all platform admins
  const admins = await prisma.user.findMany({
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

  console.log('Platform Admins:', JSON.stringify(admins, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
