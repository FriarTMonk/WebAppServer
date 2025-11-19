import { EmailTemplate, VerificationEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml, createCalloutHtml } from './base.template';

/**
 * Email verification template
 * Sent when user registers to verify their email address
 */
export function renderVerificationEmail(data: VerificationEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Welcome!</p>`;

  const content = `
    ${greeting}

    <p>
      Thank you for joining ${data.appName}. We're honored to walk alongside you on your spiritual journey.
    </p>

    <p>
      To get started, please verify your email address by clicking the button below:
    </p>

    ${createButtonHtml(data.verificationUrl, 'Verify Email Address')}

    ${createCalloutHtml(`This link will expire in ${data.expirationHours} hours for security purposes.`)}

    <p>
      Once verified, you'll have full access to:
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 8px;">Biblical counseling conversations with AI guidance</li>
      <li style="margin-bottom: 8px;">Session history and journaling</li>
      <li style="margin-bottom: 8px;">Scripture study tools with multiple translations</li>
      <li style="margin-bottom: 8px;">Sharing sessions with trusted counselors</li>
    </ul>

    <p>
      If you didn't create an account with ${data.appName}, you can safely ignore this email.
    </p>

    <hr class="divider" />

    <p style="color: #718096; font-size: 14px;">
      <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br/>
      <span style="color: #667eea; word-break: break-all;">${data.verificationUrl}</span>
    </p>

    <p style="margin-top: 24px;">
      Blessings,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

Thank you for joining ${data.appName}. We're honored to walk alongside you on your spiritual journey.

To get started, please verify your email address by visiting this link:
${data.verificationUrl}

This link will expire in ${data.expirationHours} hours for security purposes.

Once verified, you'll have full access to:
- Biblical counseling conversations with AI guidance
- Session history and journaling
- Scripture study tools with multiple translations
- Sharing sessions with trusted counselors

If you didn't create an account with ${data.appName}, you can safely ignore this email.

Blessings,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Verify your email for ${data.appName}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
