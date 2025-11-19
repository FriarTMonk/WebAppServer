import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml, createCalloutHtml } from './base.template';

/**
 * Organization 30-day invoice template
 * Sent 30 days before organization contract renewal date with invoice
 */
export function renderOrg30DayInvoiceEmail(data: BillingEmailData): EmailTemplate {
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
      Your organization's ${data.appName} subscription is due for renewal in 30 days. Below is your invoice
      for the upcoming contract period.
    </p>

    <div style="background-color: #f7fafc; border: 2px solid #667eea; padding: 24px; margin: 24px 0; border-radius: 8px;">
      <p style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 0 0 12px 0;">
        Invoice Details
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Organization:</td>
          <td style="padding: 8px 0; color: #2d3748; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">
            ${data.organizationName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Renewal Date:</td>
          <td style="padding: 8px 0; color: #2d3748; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">
            ${renewalDateFormatted}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0 0 0; color: #2d3748; font-size: 18px; font-weight: 700;">Total Amount Due:</td>
          <td style="padding: 12px 0 0 0; color: #667eea; font-size: 22px; font-weight: 700; text-align: right;">
            ${formattedAmount}
          </td>
        </tr>
      </table>
    </div>

    ${createCalloutHtml(`Payment is due by ${renewalDateFormatted}. Please arrange payment to ensure uninterrupted service.`)}

    <p>
      <strong>Payment options:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">Wire transfer (preferred for organizations)</li>
      <li style="margin-bottom: 10px;">Check by mail</li>
      <li style="margin-bottom: 10px;">Credit card (contact us for processing)</li>
      <li style="margin-bottom: 10px;">ACH transfer</li>
    </ul>

    <p>
      Please reply to this email or contact our billing team at ${data.supportEmail} to arrange payment
      or if you have any questions about your invoice.
    </p>

    ${data.invoiceUrl ? `
    <p style="text-align: center; margin: 24px 0;">
      ${createButtonHtml(data.invoiceUrl, 'Download Invoice PDF')}
    </p>
    ` : ''}

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        ⚠️ Important
      </p>
      <p style="margin: 0; color: #2d3748;">
        To avoid service interruption, please ensure payment is received by the renewal date.
        If payment is not received, your organization's account will be suspended 10 days after the renewal date.
      </p>
    </div>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Need to discuss your plan or make changes?</strong> We're happy to work with you.
      Contact us at ${data.supportEmail} or call our support team.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      Thank you for your partnership,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

Your organization's ${data.appName} subscription is due for renewal in 30 days. Below is your invoice
for the upcoming contract period.

INVOICE DETAILS
Organization: ${data.organizationName}
Renewal Date: ${renewalDateFormatted}
Total Amount Due: ${formattedAmount}

⚠️ Payment is due by ${renewalDateFormatted}. Please arrange payment to ensure uninterrupted service.

PAYMENT OPTIONS:
- Wire transfer (preferred for organizations)
- Check by mail
- Credit card (contact us for processing)
- ACH transfer

Please reply to this email or contact our billing team at ${data.supportEmail} to arrange payment
or if you have any questions about your invoice.

${data.invoiceUrl ? `Download invoice PDF: ${data.invoiceUrl}` : ''}

⚠️ IMPORTANT
To avoid service interruption, please ensure payment is received by the renewal date.
If payment is not received, your organization's account will be suspended 10 days after the renewal date.

Need to discuss your plan or make changes? We're happy to work with you.
Contact us at ${data.supportEmail} or call our support team.

Thank you for your partnership,
The ${data.appName} Team
  `.trim();

  return {
    subject: `${data.organizationName} - Invoice for subscription renewal (Due: ${renewalDateFormatted})`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
