const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAdmin() {
  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'admin@mychristiancounselor.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✓ Found user:', user.id);

    // Get the system organization
    const systemOrg = await prisma.organization.findFirst({
      where: { isSystemOrganization: true }
    });

    if (!systemOrg) {
      console.log('❌ System organization not found');
      return;
    }

    console.log('✓ Found system org:', systemOrg.id, systemOrg.name);

    // Check if membership already exists
    const existing = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: systemOrg.id
      }
    });

    if (existing) {
      console.log('✓ User is already a member of system org');
      return;
    }

    // Get the admin role
    const adminRole = await prisma.organizationRole.findFirst({
      where: {
        organizationId: systemOrg.id,
        name: 'Admin'
      }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found in system org');
      return;
    }

    console.log('✓ Found admin role:', adminRole.id);

    // Create the membership
    const membership = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: systemOrg.id,
        roleId: adminRole.id
      }
    });

    console.log('✅ SUCCESS! Added user to system organization');
    console.log('   Membership ID:', membership.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdmin();
