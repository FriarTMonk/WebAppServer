import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createCalloutHtml } from './base.template';

/**
 * Subscription cancelled email template
 * Sent when user cancels their subscription
 */
export function renderSubscriptionCancelledEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const accessEndDate = data.nextBillingDate
    ? data.nextBillingDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'the end of your current billing period';

  const content = `
    ${greeting}

    <p>
      We're writing to confirm that your ${data.appName} subscription has been cancelled.
    </p>

    <div style="background-color: #f7fafc; border: 2px solid #718096; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <p style="color: #2d3748; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
        Subscription Cancelled
      </p>
      <p style="color: #4a5568; font-size: 16px; margin: 0;">
        You will not be charged again
      </p>
    </div>

    ${createCalloutHtml(`You'll continue to have access to all features until ${accessEndDate}.`)}

    <p>
      After that date:
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">You can still access your account and view past sessions</li>
      <li style="margin-bottom: 10px;">Your session history and notes will be preserved</li>
      <li style="margin-bottom: 10px;">Some features will be limited to registered user access only</li>
      <li style="margin-bottom: 10px;">You can resubscribe anytime to regain full access</li>
    </ul>

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        💬 We'd Love Your Feedback
      </p>
      <p style="margin: 0; color: #2d3748;">
        Would you mind sharing why you're leaving? Your feedback helps us improve ${data.appName}
        for everyone. Simply reply to this email with your thoughts - we read every response.
      </p>
    </div>

    <p>
      We're sad to see you go, but we understand that circumstances change. If you decide to return,
      we'll be here with open arms.
    </p>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Changed your mind?</strong> You can reactivate your subscription anytime from your
      account settings at ${data.appUrl}/settings/billing.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      May God's grace continue with you,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

We're writing to confirm that your ${data.appName} subscription has been cancelled.

SUBSCRIPTION CANCELLED
You will not be charged again

You'll continue to have access to all features until ${accessEndDate}.

After that date:
- You can still access your account and view past sessions
- Your session history and notes will be preserved
- Some features will be limited to registered user access only
- You can resubscribe anytime to regain full access

💬 WE'D LOVE YOUR FEEDBACK
Would you mind sharing why you're leaving? Your feedback helps us improve ${data.appName}
for everyone. Simply reply to this email with your thoughts - we read every response.

We're sad to see you go, but we understand that circumstances change. If you decide to return,
we'll be here with open arms.

Changed your mind? You can reactivate your subscription anytime from your account settings at
${data.appUrl}/settings/billing.

May God's grace continue with you,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Your ${data.appName} subscription has been cancelled`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
