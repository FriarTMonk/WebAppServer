import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Renewal reminder email template
 * Sent a few days before subscription renewal
 */
export function renderRenewalReminderEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

  const renewalDateFormatted = data.renewalDate
    ? data.renewalDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const daysUntilRenewal = data.renewalDate
    ? Math.ceil((data.renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 3;

  const content = `
    ${greeting}

    <p>
      This is a friendly reminder that your ${data.appName} subscription will automatically renew soon.
    </p>

    <div style="background-color: #f7fafc; border: 2px solid #667eea; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <p style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 0 0 8px 0;">
        Upcoming Renewal
      </p>
      <p style="color: #2d3748; font-size: 24px; font-weight: 700; margin: 0 0 12px 0;">
        ${renewalDateFormatted}
      </p>
      <p style="color: #4a5568; font-size: 18px; font-weight: 600; margin: 0;">
        ${formattedAmount}
      </p>
      <p style="color: #718096; font-size: 14px; margin: 8px 0 0 0;">
        ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'day' : 'days'} from now
      </p>
    </div>

    <p>
      No action is needed - your subscription will automatically renew and you'll continue enjoying:
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">Unlimited AI-powered counseling sessions</li>
      <li style="margin-bottom: 10px;">Session notes and insights tracking</li>
      <li style="margin-bottom: 10px;">Advanced AI features and contextual guidance</li>
      <li style="margin-bottom: 10px;">Priority support from our team</li>
      <li style="margin-bottom: 10px;">Access to all new features</li>
    </ul>

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        🙏 Thank You
      </p>
      <p style="margin: 0; color: #2d3748;">
        We're grateful to be part of your spiritual journey. Thank you for trusting ${data.appName}
        as your companion in seeking biblical wisdom and guidance.
      </p>
    </div>

    <p style="text-align: center; margin: 24px 0;">
      ${createButtonHtml(`${data.appUrl}/settings/billing`, 'Manage Subscription')}
    </p>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Need to make changes?</strong> You can update your payment method, change your plan,
      or cancel anytime before your renewal date from your account settings.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      In His service,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

This is a friendly reminder that your ${data.appName} subscription will automatically renew soon.

UPCOMING RENEWAL
${renewalDateFormatted}
${formattedAmount}
${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'day' : 'days'} from now

No action is needed - your subscription will automatically renew and you'll continue enjoying:
- Unlimited AI-powered counseling sessions
- Session notes and insights tracking
- Advanced AI features and contextual guidance
- Priority support from our team
- Access to all new features

🙏 THANK YOU
We're grateful to be part of your spiritual journey. Thank you for trusting ${data.appName}
as your companion in seeking biblical wisdom and guidance.

Manage your subscription: ${data.appUrl}/settings/billing

Need to make changes? You can update your payment method, change your plan, or cancel anytime
before your renewal date from your account settings.

In His service,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Your ${data.appName} subscription renews in ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'day' : 'days'}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
