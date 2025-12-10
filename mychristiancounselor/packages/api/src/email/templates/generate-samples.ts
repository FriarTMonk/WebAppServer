import * as fs from 'fs';
import * as path from 'path';
import { renderVerificationEmail } from './verification.template';
import { renderPasswordResetEmail } from './password-reset.template';
import { renderSessionShareEmail } from './session-share.template';
import { renderNoteAddedEmail } from './note-added.template';
import { renderCounselorAssignmentEmail } from './counselor-assignment.template';
import { renderOrgInvitationEmail } from './org-invite.template';
import { renderSubscriptionStartedEmail } from './subscription-started.template';
import { renderPaymentSucceededEmail } from './payment-succeeded.template';
import { renderPaymentFailedEmail } from './payment-failed.template';
import { renderSubscriptionCancelledEmail } from './subscription-cancelled.template';
import { renderRenewalReminderEmail } from './renewal-reminder.template';
import { renderOrg90DayReminderEmail } from './org-90day-reminder.template';
import { renderOrg30DayInvoiceEmail } from './org-30day-invoice.template';
import { renderOrgSuspensionNoticeEmail } from './org-suspension-notice.template';
import { renderOrgSuspendedEmail } from './org-suspended.template';

/**
 * Script to generate sample HTML files for all email templates
 * Run with: npx ts-node generate-samples.ts
 */

const SAMPLES_DIR = path.join(__dirname, 'samples');
const BASE_DATA = {
  appName: 'MyChristianCounselor',
  appUrl: 'https://mychristiancounselor.com',
  supportEmail: 'support@mychristiancounselor.com',
  currentYear: new Date().getFullYear(),
};

function saveTemplate(filename: string, subject: string, html: string) {
  const filePath = path.join(SAMPLES_DIR, filename);
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ Generated: ${filename}`);
  console.log(`   Subject: ${subject}`);
}

function generateSamples() {
  console.log('🎨 Generating email template samples...\n');

  // 1. Verification Email
  const verification = renderVerificationEmail({
    ...BASE_DATA,
    recipientName: 'Sarah Johnson',
    verificationUrl: 'https://mychristiancounselor.com/verify-email?token=abc123xyz789',
    expirationHours: 24,
  });
  saveTemplate('verification-email.html', verification.subject, verification.html);

  // 2. Password Reset Email
  const passwordReset = renderPasswordResetEmail({
    ...BASE_DATA,
    recipientName: 'John Smith',
    resetUrl: 'https://mychristiancounselor.com/reset-password?token=reset456def',
    expirationHours: 1,
  });
  saveTemplate('password-reset-email.html', passwordReset.subject, passwordReset.html);

  // 3. Session Share Email
  const sessionShare = renderSessionShareEmail({
    ...BASE_DATA,
    recipientName: 'Pastor Michael',
    senderName: 'Emily Brown',
    sessionTitle: 'Overcoming Anxiety Through Faith',
    sessionTopics: ['Anxiety', 'Trust in God', 'Prayer', 'Peace'],
    shareUrl: 'https://mychristiancounselor.com/sessions/shared?token=share789ghi',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
  saveTemplate('session-share-email.html', sessionShare.subject, sessionShare.html);

  // 4. Note Added Email
  const noteAdded = renderNoteAddedEmail({
    ...BASE_DATA,
    recipientName: 'David Wilson',
    authorName: 'Counselor Rebecca',
    sessionTitle: 'Marriage Counseling - Communication',
    sessionUrl: 'https://mychristiancounselor.com/sessions/12345?tab=notes',
  });
  saveTemplate('note-added-email.html', noteAdded.subject, noteAdded.html);

  // 5. Counselor Assignment Email (for Member)
  const counselorAssignmentMember = renderCounselorAssignmentEmail({
    ...BASE_DATA,
    recipientName: 'Lisa Anderson',
    counselorName: 'Dr. James Thompson',
    organizationName: 'Grace Community Church',
    dashboardUrl: 'https://mychristiancounselor.com/dashboard',
    isForMember: true,
  });
  saveTemplate('counselor-assignment-member.html', counselorAssignmentMember.subject, counselorAssignmentMember.html);

  // 6. Counselor Assignment Email (for Counselor)
  const counselorAssignmentCounselor = renderCounselorAssignmentEmail({
    ...BASE_DATA,
    recipientName: 'Dr. James Thompson',
    memberName: 'Lisa Anderson',
    organizationName: 'Grace Community Church',
    dashboardUrl: 'https://mychristiancounselor.com/counselor/dashboard',
    isForMember: false,
  });
  saveTemplate('counselor-assignment-counselor.html', counselorAssignmentCounselor.subject, counselorAssignmentCounselor.html);

  // 7. Organization Invitation Email
  const orgInvitation = renderOrgInvitationEmail({
    ...BASE_DATA,
    recipientName: 'Mark Roberts',
    inviterName: 'Pastor John Davis',
    organizationName: 'Faith Baptist Church',
    roleName: 'Counselor',
    acceptUrl: 'https://mychristiancounselor.com/invitations/accept/invite123abc',
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  });
  saveTemplate('org-invitation-email.html', orgInvitation.subject, orgInvitation.html);

  // 8. Subscription Started Email
  const subscriptionStarted = renderSubscriptionStartedEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'subscription_started',
    amount: 99.00,
    currency: 'USD',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('subscription-started-email.html', subscriptionStarted.subject, subscriptionStarted.html);

  // 9. Payment Succeeded Email
  const paymentSucceeded = renderPaymentSucceededEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'payment_succeeded',
    amount: 99.00,
    currency: 'USD',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    invoiceUrl: 'https://mychristiancounselor.com/billing/invoices/inv_123',
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('payment-succeeded-email.html', paymentSucceeded.subject, paymentSucceeded.html);

  // 10. Payment Failed Email
  const paymentFailed = renderPaymentFailedEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'payment_failed',
    amount: 99.00,
    currency: 'USD',
    updatePaymentUrl: 'https://mychristiancounselor.com/billing/payment-methods',
    gracePeriodDays: 7,
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('payment-failed-email.html', paymentFailed.subject, paymentFailed.html);

  // 11. Subscription Cancelled Email
  const subscriptionCancelled = renderSubscriptionCancelledEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'subscription_cancelled',
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('subscription-cancelled-email.html', subscriptionCancelled.subject, subscriptionCancelled.html);

  // 12. Renewal Reminder Email
  const renewalReminder = renderRenewalReminderEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'renewal_reminder',
    amount: 99.00,
    currency: 'USD',
    renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('renewal-reminder-email.html', renewalReminder.subject, renewalReminder.html);

  // 13. Org 90-Day Reminder Email
  const org90DayReminder = renderOrg90DayReminderEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'org_90day_reminder',
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('org-90day-reminder-email.html', org90DayReminder.subject, org90DayReminder.html);

  // 14. Org 30-Day Invoice Email
  const org30DayInvoice = renderOrg30DayInvoiceEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'org_30day_invoice',
    amount: 99.00,
    currency: 'USD',
    invoiceUrl: 'https://mychristiancounselor.com/billing/invoices/inv_456',
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('org-30day-invoice-email.html', org30DayInvoice.subject, org30DayInvoice.html);

  // 15. Org Suspension Notice Email
  const orgSuspensionNotice = renderOrgSuspensionNoticeEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'org_suspension_notice',
    gracePeriodDays: 3,
    updatePaymentUrl: 'https://mychristiancounselor.com/billing/payment-methods',
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('org-suspension-notice-email.html', orgSuspensionNotice.subject, orgSuspensionNotice.html);

  // 16. Org Suspended Email
  const orgSuspended = renderOrgSuspendedEmail({
    ...BASE_DATA,
    recipientName: 'Administrator',
    emailSubType: 'org_suspended',
    updatePaymentUrl: 'https://mychristiancounselor.com/billing/payment-methods',
    organizationName: 'Cornerstone Community Church',
  });
  saveTemplate('org-suspended-email.html', orgSuspended.subject, orgSuspended.html);

  console.log('\n✨ All email samples generated successfully!');
  console.log(`📁 Samples saved to: ${SAMPLES_DIR}`);
}

// Run the generator
generateSamples();
