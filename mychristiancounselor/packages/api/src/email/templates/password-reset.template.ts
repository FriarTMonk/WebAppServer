import { EmailTemplate, PasswordResetEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml, createCalloutHtml } from './base.template';

/**
 * Password reset email template
 * Sent when user requests to reset their password
 */
export function renderPasswordResetEmail(data: PasswordResetEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const content = `
    ${greeting}

    <p>
      We received a request to reset your password for your ${data.appName} account.
      If you made this request, click the button below to create a new password:
    </p>

    ${createButtonHtml(data.resetUrl, 'Reset My Password')}

    ${createCalloutHtml(`This link will expire in ${data.expirationHours} hour${data.expirationHours !== 1 ? 's' : ''} for security.`)}

    <p>
      <strong>For your security:</strong>
    </p>

    <ul style="margin: 16px 0; padding-left: 20px; color: #2d3748;">
      <li style="margin-bottom: 8px;">This link can only be used once</li>
      <li style="margin-bottom: 8px;">You'll be logged out of all devices after resetting</li>
      <li style="margin-bottom: 8px;">Choose a strong, unique password</li>
    </ul>

    <hr class="divider" />

    <p style="color: #e53e3e; font-weight: 500;">
      ⚠️ If you didn't request a password reset, please ignore this email. Your account is secure.
    </p>

    <p style="color: #718096; font-size: 14px; margin-top: 16px;">
      If you're having trouble accessing your account, please contact our support team at
      <a href="mailto:${data.supportEmail}" style="color: #667eea;">${data.supportEmail}</a>
    </p>

    <hr class="divider" />

    <p style="color: #718096; font-size: 14px;">
      <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br/>
      <span style="color: #667eea; word-break: break-all;">${data.resetUrl}</span>
    </p>

    <p style="margin-top: 24px;">
      In Christ's care,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

We received a request to reset your password for your ${data.appName} account.
If you made this request, visit this link to create a new password:

${data.resetUrl}

This link will expire in ${data.expirationHours} hour${data.expirationHours !== 1 ? 's' : ''} for security.

For your security:
- This link can only be used once
- You'll be logged out of all devices after resetting
- Choose a strong, unique password

⚠️ If you didn't request a password reset, please ignore this email. Your account is secure.

If you're having trouble accessing your account, please contact our support team at ${data.supportEmail}

In Christ's care,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Reset your password - ${data.appName}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
