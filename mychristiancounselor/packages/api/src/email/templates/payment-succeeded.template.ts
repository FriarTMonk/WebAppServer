import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Payment succeeded email template
 * Sent when a subscription payment is successfully processed
 */
export function renderPaymentSucceededEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

  const paymentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const nextBillingFormatted = data.nextBillingDate
    ? data.nextBillingDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const content = `
    ${greeting}

    <p>
      Thank you for your continued support of ${data.appName}. Your payment has been successfully processed.
    </p>

    <div style="background-color: #f7fafc; border: 2px solid #48bb78; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <div style="background-color: #48bb78; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 32px; line-height: 0;">✓</span>
      </div>
      <p style="color: #2d3748; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">
        Payment Successful
      </p>
      <p style="color: #4a5568; font-size: 24px; font-weight: 600; margin: 0;">
        ${formattedAmount}
      </p>
      <p style="color: #718096; font-size: 14px; margin: 8px 0 0 0;">
        Paid on ${paymentDate}
      </p>
    </div>

    <p>
      Your subscription remains active, and you'll continue to have full access to all features.
    </p>

    ${data.nextBillingDate ? `
    <p>
      Your next billing date is <strong>${nextBillingFormatted}</strong>.
    </p>
    ` : ''}

    ${data.invoiceUrl ? `
    <p style="text-align: center; margin: 24px 0;">
      ${createButtonHtml(data.invoiceUrl, 'View Invoice')}
    </p>
    ` : ''}

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Questions about your payment?</strong> You can view your billing history and download
      receipts anytime from your account settings, or contact us at ${data.supportEmail}.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      Blessings,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

Thank you for your continued support of ${data.appName}. Your payment has been successfully processed.

✓ PAYMENT SUCCESSFUL
${formattedAmount}
Paid on ${paymentDate}

Your subscription remains active, and you'll continue to have full access to all features.

${data.nextBillingDate ? `Your next billing date is ${nextBillingFormatted}.` : ''}

${data.invoiceUrl ? `View your invoice: ${data.invoiceUrl}` : ''}

Questions about your payment? You can view your billing history and download receipts anytime from
your account settings, or contact us at ${data.supportEmail}.

Blessings,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Payment received - ${data.appName} subscription`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
