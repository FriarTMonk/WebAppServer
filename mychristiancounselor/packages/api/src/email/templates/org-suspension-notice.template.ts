import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Organization suspension notice template
 * Sent on renewal date (day 0) when payment has not been received
 */
export function renderOrgSuspensionNoticeEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

  const suspensionDate = data.renewalDate
    ? new Date(data.renewalDate.getTime() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const gracePeriodDays = data.gracePeriodDays || 10;

  const content = `
    ${greeting}

    <p>
      We have not yet received payment for your organization's ${data.appName} subscription renewal.
      The payment deadline has passed.
    </p>

    <div style="background-color: #fff5f5; border: 2px solid #fc8181; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <div style="background-color: #fc8181; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px; line-height: 0;">⚠</span>
      </div>
      <p style="color: #742a2a; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">
        Payment Overdue
      </p>
      <p style="color: #c53030; font-size: 16px; margin: 0;">
        ${data.organizationName}
      </p>
      <p style="color: #c53030; font-size: 22px; font-weight: 600; margin: 12px 0 0 0;">
        ${formattedAmount}
      </p>
    </div>

    <div style="background-color: #fef5e7; border: 2px solid #f39c12; padding: 24px; margin: 24px 0; border-radius: 8px;">
      <p style="color: #7d6608; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
        ⏰ ${gracePeriodDays}-Day Grace Period
      </p>
      <p style="margin: 0; color: #7d6608; font-size: 16px;">
        Your organization's account will remain active until <strong>${suspensionDate}</strong>.
        If payment is not received by then, your account will be suspended and all members will
        lose access to ${data.appName} services.
      </p>
    </div>

    <p>
      <strong>What happens if payment is not received:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">All organization members will lose access to counseling sessions</li>
      <li style="margin-bottom: 10px;">Counselor assignments will be suspended</li>
      <li style="margin-bottom: 10px;">Session history will be preserved but inaccessible</li>
      <li style="margin-bottom: 10px;">Account can be reactivated upon payment receipt</li>
    </ul>

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        💬 Let's Resolve This Together
      </p>
      <p style="margin: 0; color: #2d3748;">
        We understand that circumstances can change. If you're experiencing financial difficulties
        or need to discuss payment arrangements, please contact us immediately. We're committed to
        finding a solution that works for your organization.
      </p>
    </div>

    <p style="text-align: center; margin: 32px 0;">
      ${createButtonHtml(`mailto:${data.supportEmail}?subject=Urgent: Payment for ${data.organizationName}`, 'Contact Billing Team')}
    </p>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Need immediate assistance?</strong> Please call our billing team or reply to this email.
      We're here to help and want to ensure your organization can continue serving its members.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      With concern and ready to help,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

We have not yet received payment for your organization's ${data.appName} subscription renewal.
The payment deadline has passed.

⚠ PAYMENT OVERDUE
${data.organizationName}
Amount Due: ${formattedAmount}

⏰ ${gracePeriodDays}-DAY GRACE PERIOD
Your organization's account will remain active until ${suspensionDate}.
If payment is not received by then, your account will be suspended and all members will
lose access to ${data.appName} services.

What happens if payment is not received:
- All organization members will lose access to counseling sessions
- Counselor assignments will be suspended
- Session history will be preserved but inaccessible
- Account can be reactivated upon payment receipt

💬 LET'S RESOLVE THIS TOGETHER
We understand that circumstances can change. If you're experiencing financial difficulties
or need to discuss payment arrangements, please contact us immediately. We're committed to
finding a solution that works for your organization.

Contact our billing team: ${data.supportEmail}

Need immediate assistance? Please call our billing team or reply to this email.
We're here to help and want to ensure your organization can continue serving its members.

With concern and ready to help,
The ${data.appName} Team
  `.trim();

  return {
    subject: `URGENT: ${data.organizationName} - Payment overdue, account suspension pending`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
