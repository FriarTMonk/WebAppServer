import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Organization 90-day renewal reminder template
 * Sent 90 days before organization contract renewal date
 */
export function renderOrg90DayReminderEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const renewalDateFormatted = data.renewalDate
    ? data.renewalDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

  const content = `
    ${greeting}

    <p>
      This is a friendly reminder that your organization's ${data.appName} subscription will be up for renewal in 90 days.
    </p>

    <div style="background-color: #f7fafc; border: 2px solid #667eea; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <p style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 0 0 8px 0;">
        Organization Subscription
      </p>
      <p style="color: #2d3748; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">
        ${data.organizationName}
      </p>
      <p style="color: #4a5568; font-size: 16px; margin: 0 0 12px 0;">
        Renewal Date: <strong>${renewalDateFormatted}</strong>
      </p>
      ${formattedAmount ? `
      <p style="color: #4a5568; font-size: 18px; font-weight: 600; margin: 0;">
        Estimated Amount: ${formattedAmount}
      </p>
      ` : ''}
    </div>

    <p>
      <strong>What happens next:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">In 60 days, we'll send you an invoice with the exact renewal amount</li>
      <li style="margin-bottom: 10px;">Your organization will continue to have uninterrupted access to all features</li>
      <li style="margin-bottom: 10px;">If you need to make changes to your plan, please contact us</li>
      <li style="margin-bottom: 10px;">No action is required from you at this time</li>
    </ul>

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        📊 Review Your Usage
      </p>
      <p style="margin: 0; color: #2d3748;">
        This is a great time to review how your organization is using ${data.appName}. Check your
        member activity, counselor assignments, and ensure everyone is getting the support they need.
      </p>
    </div>

    ${createButtonHtml(`${data.appUrl}/organization/settings`, 'View Organization Settings')}

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Questions or need to discuss your renewal?</strong> Please contact our team at ${data.supportEmail}.
      We're here to ensure your organization continues to receive excellent service and support.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      Serving together in Christ,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

This is a friendly reminder that your organization's ${data.appName} subscription will be up for renewal in 90 days.

ORGANIZATION SUBSCRIPTION
${data.organizationName}
Renewal Date: ${renewalDateFormatted}
${formattedAmount ? `Estimated Amount: ${formattedAmount}` : ''}

What happens next:
- In 60 days, we'll send you an invoice with the exact renewal amount
- Your organization will continue to have uninterrupted access to all features
- If you need to make changes to your plan, please contact us
- No action is required from you at this time

📊 REVIEW YOUR USAGE
This is a great time to review how your organization is using ${data.appName}. Check your
member activity, counselor assignments, and ensure everyone is getting the support they need.

View organization settings: ${data.appUrl}/organization/settings

Questions or need to discuss your renewal? Please contact our team at ${data.supportEmail}.
We're here to ensure your organization continues to receive excellent service and support.

Serving together in Christ,
The ${data.appName} Team
  `.trim();

  return {
    subject: `${data.organizationName} - Subscription renewal in 90 days`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
