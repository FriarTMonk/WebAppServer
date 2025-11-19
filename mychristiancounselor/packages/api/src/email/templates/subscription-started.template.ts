import { EmailTemplate, BillingEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml, createCalloutHtml } from './base.template';

/**
 * Subscription started email template
 * Sent when user successfully starts a new subscription
 */
export function renderSubscriptionStartedEmail(data: BillingEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const planType = data.amount === 9.99 ? 'Monthly' : 'Annual';
  const formattedAmount = data.amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount)
    : '';

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
      Welcome to the ${data.appName} community! We're honored to walk with you on your spiritual journey.
    </p>

    <div style="background-color: #f7fafc; border: 2px solid #667eea; padding: 24px; margin: 24px 0; border-radius: 8px; text-align: center;">
      <p style="color: #667eea; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 0 0 8px 0;">
        Your Subscription
      </p>
      <p style="color: #2d3748; font-size: 28px; font-weight: 700; margin: 0 0 12px 0;">
        ${planType} Plan
      </p>
      <p style="color: #4a5568; font-size: 18px; font-weight: 600; margin: 0;">
        ${formattedAmount}${planType === 'Monthly' ? '/month' : '/year'}
      </p>
    </div>

    <p>
      <strong>What's included with your subscription:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 10px;">Unlimited AI-powered counseling sessions</li>
      <li style="margin-bottom: 10px;">Session notes and insights tracking</li>
      <li style="margin-bottom: 10px;">Advanced AI features and contextual guidance</li>
      <li style="margin-bottom: 10px;">Priority support from our team</li>
      <li style="margin-bottom: 10px;">Access to all future features</li>
    </ul>

    <p>
      Your next billing date is <strong>${nextBillingFormatted}</strong>. We'll send you a reminder before then.
    </p>

    ${createButtonHtml(`${data.appUrl}/dashboard`, 'Start Your Journey')}

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        📖 Getting Started
      </p>
      <p style="margin: 0; color: #2d3748;">
        Begin by sharing what's on your heart. Our AI counselor is here to listen, understand, and provide
        biblical guidance tailored to your unique situation.
      </p>
    </div>

    <p style="color: #718096; font-size: 14px; margin-top: 24px;">
      <strong>Need help?</strong> You can manage your subscription, update payment methods, or view invoices
      anytime from your account settings.
    </p>

    <hr class="divider" />

    <p style="margin-top: 24px;">
      May God's peace be with you,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

Welcome to the ${data.appName} community! We're honored to walk with you on your spiritual journey.

YOUR SUBSCRIPTION
${planType} Plan - ${formattedAmount}${planType === 'Monthly' ? '/month' : '/year'}

What's included with your subscription:
- Unlimited AI-powered counseling sessions
- Session notes and insights tracking
- Advanced AI features and contextual guidance
- Priority support from our team
- Access to all future features

Your next billing date is ${nextBillingFormatted}. We'll send you a reminder before then.

Start your journey: ${data.appUrl}/dashboard

📖 GETTING STARTED
Begin by sharing what's on your heart. Our AI counselor is here to listen, understand, and provide
biblical guidance tailored to your unique situation.

Need help? You can manage your subscription, update payment methods, or view invoices anytime from
your account settings.

May God's peace be with you,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Welcome to ${data.appName} - Your subscription is active`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
