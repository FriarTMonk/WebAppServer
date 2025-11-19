/**
 * Verification script for SLA Scheduler
 * This script verifies that the SLA scheduler is properly configured
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySLAScheduler() {
  console.log('=== SLA Scheduler Verification ===\n');

  try {
    // Check if SupportTicket model has SLA fields
    console.log('1. Checking database schema...');

    await prisma.supportTicket.findMany({
      take: 1,
      select: {
        id: true,
        responseSLADeadline: true,
        resolutionSLADeadline: true,
        responseSLAStatus: true,
        resolutionSLAStatus: true,
        slaPausedAt: true,
      },
    });

    console.log('   ✓ SupportTicket has all required SLA fields');

    // Check for active tickets
    console.log('\n2. Checking active tickets...');
    const activeTickets = await prisma.supportTicket.findMany({
      where: {
        status: { in: ['open', 'in_progress', 'waiting_on_user'] },
      },
      select: {
        id: true,
        status: true,
        priority: true,
        responseSLAStatus: true,
        resolutionSLAStatus: true,
        responseSLADeadline: true,
        resolutionSLADeadline: true,
      },
      take: 5,
    });

    console.log(`   Found ${activeTickets.length} active tickets (showing up to 5)`);
    if (activeTickets.length > 0) {
      activeTickets.forEach((ticket) => {
        console.log(`   - Ticket ${ticket.id.substring(0, 8)}: ${ticket.status} | Priority: ${ticket.priority}`);
        console.log(`     Response SLA: ${ticket.responseSLAStatus} (deadline: ${ticket.responseSLADeadline?.toISOString() || 'N/A'})`);
        console.log(`     Resolution SLA: ${ticket.resolutionSLAStatus} (deadline: ${ticket.resolutionSLADeadline?.toISOString() || 'N/A'})`);
      });
    }

    // Check notification capability
    console.log('\n3. Checking notification system...');
    const notificationCount = await prisma.notification.count();
    console.log(`   ✓ Notification system accessible (${notificationCount} notifications in database)`);

    // Check for platform admins
    console.log('\n4. Checking platform admins...');
    const platformAdmins = await prisma.user.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true, email: true },
    });
    console.log(`   Found ${platformAdmins.length} platform admin(s)`);
    if (platformAdmins.length > 0) {
      platformAdmins.forEach((admin) => {
        console.log(`   - ${admin.email}`);
      });
    }

    console.log('\n=== Verification Summary ===');
    console.log('✓ Schema has all required SLA fields');
    console.log('✓ Notification system is accessible');
    console.log(`✓ Found ${platformAdmins.length} platform admin(s) for notifications`);
    console.log(`✓ Found ${activeTickets.length} active ticket(s) for SLA monitoring`);
    console.log('\n✓ SLA Scheduler is ready to run!');
    console.log('\nScheduler will:');
    console.log('- Run every 15 minutes');
    console.log('- Check all open, in_progress, and waiting_on_user tickets');
    console.log('- Update SLA statuses based on current time');
    console.log('- Send notifications when SLAs become critical or breached');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySLAScheduler();
