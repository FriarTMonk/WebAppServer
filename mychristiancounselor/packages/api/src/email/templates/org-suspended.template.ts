import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Organization account suspended template
 * Sent 10 days after renewal date when payment has not been received
 */
export function renderOrgSuspendedEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

  const content = `
    ${greeting}

    <p>
      We regret to inform you that your organization's ${data.appName} account has been suspended
      due to non-payment.
    </p>

    <div style="background-color: #fff5f5; border: 2px solid #e53e3e; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <div style="background-color: #e53e3e; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px; line-height: 0;">✕</span>
      </div>
      <p style="color: #742a2a; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">
        Account Suspended
      </p>
      <p style="color: #c53030; font-size: 16px; margin: 0;">
        ${data.organizationName}
      </p>
    </div>

    <p>
      <strong>Current status of your account:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">All organization members have lost access to ${data.appName}</li>
      <li style="margin-bottom: 10px;">New counseling sessions cannot be started</li>
      <li style="margin-bottom: 10px;">Counselor assignments are inactive</li>
      <li style="margin-bottom: 10px;">Session history and data are preserved but inaccessible</li>
    </ul>

    <div style="background-color: #f0fff4; border: 2px solid #48bb78; padding: 24px; margin: 24px 0; border-radius: 8px;">
      <p style="color: #22543d; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
        ✓ Your Data is Safe
      </p>
      <p style="margin: 0; color: #22543d; font-size: 16px;">
        All session history, member profiles, and counselor notes are securely preserved.
        Once payment is received, your account will be immediately reactivated and all members
        will regain full access.
      </p>
    </div>

    <p>
      <strong>Outstanding balance:</strong> ${formattedAmount}
    </p>

    <p>
      To reactivate your account, please contact our billing team to arrange payment.
      We accept wire transfers, checks, credit cards, and ACH payments.
    </p>

    <p style="text-align: center; margin: 32px 0;">
      ${createButtonHtml(`mailto:${data.supportEmail}?subject=Account Reactivation: ${data.organizationName}`, 'Contact Billing to Reactivate')}
    </p>

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        💙 We Want to Help
      </p>
      <p style="margin: 0; color: #2d3748;">
        If your organization is experiencing financial hardship, please reach out to us.
        We may be able to work out a payment plan or find other solutions. Our mission is to ensure
        that faith-based counseling support remains accessible to those who need it.
      </p>
    </div>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>No longer need the service?</strong> If you wish to permanently close your organization's
      account, please contact us to discuss data export and account closure procedures.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      We hope to serve you again soon,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

We regret to inform you that your organization's ${data.appName} account has been suspended
due to non-payment.

✕ ACCOUNT SUSPENDED
${data.organizationName}

Current status of your account:
- All organization members have lost access to ${data.appName}
- New counseling sessions cannot be started
- Counselor assignments are inactive
- Session history and data are preserved but inaccessible

✓ YOUR DATA IS SAFE
All session history, member profiles, and counselor notes are securely preserved.
Once payment is received, your account will be immediately reactivated and all members
will regain full access.

Outstanding balance: ${formattedAmount}

To reactivate your account, please contact our billing team to arrange payment.
We accept wire transfers, checks, credit cards, and ACH payments.

Contact billing team: ${data.supportEmail}

💙 WE WANT TO HELP
If your organization is experiencing financial hardship, please reach out to us.
We may be able to work out a payment plan or find other solutions. Our mission is to ensure
that faith-based counseling support remains accessible to those who need it.

No longer need the service? If you wish to permanently close your organization's account,
please contact us to discuss data export and account closure procedures.

We hope to serve you again soon,
The ${data.appName} Team
  `.trim();

  return {
    subject: `ACCOUNT SUSPENDED: ${data.organizationName} - Action required`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
