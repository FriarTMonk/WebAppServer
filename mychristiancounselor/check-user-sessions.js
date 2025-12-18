#!/usr/bin/env node
/**
 * Diagnostic script to check user session status
 * Usage: node check-user-sessions.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserSessions() {
  try {
    const emails = ['ninetucks@yahoo.com', 'servantministry123@gmail.com'];

    for (const email of emails) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Checking user: ${email}`);
      console.log('='.repeat(60));

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          refreshTokens: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          sessions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        console.log(`❌ User not found: ${email}`);
        continue;
      }

      console.log(`\n✅ User found:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email verified: ${user.emailVerified}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Account type: ${user.accountType}`);
      console.log(`   Subscription: ${user.subscriptionStatus} (${user.subscriptionTier || 'none'})`);
      console.log(`   Created: ${user.createdAt}`);

      // Check refresh tokens
      console.log(`\n📋 Refresh Tokens (${user.refreshTokens.length} total):`);
      if (user.refreshTokens.length === 0) {
        console.log('   ⚠️  No refresh tokens found - user may not be logged in');
      } else {
        const now = new Date();
        user.refreshTokens.forEach((token, idx) => {
          const isExpired = token.expiresAt < now;
          const status = isExpired ? '❌ EXPIRED' : '✅ VALID';
          console.log(`   ${idx + 1}. ${status}`);
          console.log(`      Created: ${token.createdAt}`);
          console.log(`      Expires: ${token.expiresAt}`);
          console.log(`      IP: ${token.ipAddress || 'N/A'}`);
          console.log(`      User Agent: ${token.userAgent ? token.userAgent.substring(0, 50) + '...' : 'N/A'}`);
        });
      }

      // Check active sessions
      console.log(`\n💬 Active Sessions (${user.sessions.length} total):`);
      if (user.sessions.length === 0) {
        console.log('   No active sessions');
      } else {
        user.sessions.forEach((session, idx) => {
          console.log(`   ${idx + 1}. Session ID: ${session.id}`);
          console.log(`      Title: ${session.title}`);
          console.log(`      Created: ${session.createdAt}`);
          console.log(`      Updated: ${session.updatedAt}`);
        });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Session timeout configuration:');
    console.log('='.repeat(60));
    console.log('JWT Access Token Expiration: 15 minutes (hardcoded in auth.service.ts)');
    console.log('Refresh Token Expiration: 30 days (hardcoded in auth.service.ts)');
    console.log('SESSION_TIMEOUT_MINUTES constant: 60 minutes (in shared/constants)');
    console.log('\n⚠️  NOTE: The JWT access token expires after 15 minutes.');
    console.log('If the user does not use the refresh token to get a new access token,');
    console.log('they will see a "session timeout" error on their next API call.');

  } catch (error) {
    console.error('Error checking user sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserSessions();
