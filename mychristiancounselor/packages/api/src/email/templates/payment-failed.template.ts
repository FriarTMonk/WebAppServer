import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml, createCalloutHtml } from './base.template';

/**
 * Payment failed email template
 * Sent when a subscription payment fails
 */
export function renderPaymentFailedEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

  const gracePeriodDays = data.gracePeriodDays || 7;

  const content = `
    ${greeting}

    <p>
      We attempted to process your subscription payment but were unable to complete the transaction.
    </p>

    <div style="background-color: #fff5f5; border: 2px solid #fc8181; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <div style="background-color: #fc8181; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px; line-height: 0;">!</span>
      </div>
      <p style="color: #742a2a; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">
        Payment Failed
      </p>
      <p style="color: #c53030; font-size: 24px; font-weight: 600; margin: 0;">
        ${formattedAmount}
      </p>
    </div>

    <p>
      <strong>Common reasons for payment failures:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">Insufficient funds in your account</li>
      <li style="margin-bottom: 10px;">Expired or invalid payment method</li>
      <li style="margin-bottom: 10px;">Card declined by your bank</li>
      <li style="margin-bottom: 10px;">Billing address mismatch</li>
    </ul>

    ${createCalloutHtml(`Your subscription will remain active for ${gracePeriodDays} days while you update your payment information. After that, your account may be suspended.`)}

    <p>
      Please update your payment method as soon as possible to avoid any interruption to your service.
    </p>

    ${createButtonHtml(data.updatePaymentUrl || `${data.appUrl}/settings/billing`, 'Update Payment Method')}

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        💡 Need Help?
      </p>
      <p style="margin: 0; color: #2d3748;">
        If you're experiencing issues updating your payment method or have questions about this charge,
        please contact our support team at ${data.supportEmail}. We're here to help!
      </p>
    </div>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Don't want to continue?</strong> You can cancel your subscription anytime from your account settings.
      We'll be sad to see you go, but understand that circumstances change.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      Grace and peace,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

We attempted to process your subscription payment but were unable to complete the transaction.

! PAYMENT FAILED
${formattedAmount}

Common reasons for payment failures:
- Insufficient funds in your account
- Expired or invalid payment method
- Card declined by your bank
- Billing address mismatch

⚠️ IMPORTANT: Your subscription will remain active for ${gracePeriodDays} days while you update your payment
information. After that, your account may be suspended.

Please update your payment method as soon as possible to avoid any interruption to your service.

Update payment method: ${data.updatePaymentUrl || `${data.appUrl}/settings/billing`}

💡 NEED HELP?
If you're experiencing issues updating your payment method or have questions about this charge,
please contact our support team at ${data.supportEmail}. We're here to help!

Don't want to continue? You can cancel your subscription anytime from your account settings.
We'll be sad to see you go, but understand that circumstances change.

Grace and peace,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Action required: Payment failed for your ${data.appName} subscription`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
