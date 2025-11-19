import { EmailTemplate, OrgInvitationEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml, createCalloutHtml } from './base.template';

/**
 * Organization invitation email template
 * Sent when user is invited to join an organization
 */
export function renderOrgInvitationEmail(data: OrgInvitationEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const expirationDate = data.expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const content = `
    ${greeting}

    <p>
      <strong>${data.inviterName}</strong> has invited you to join their organization:
    </p>

    <p style="text-align: center; font-size: 22px; font-weight: 600; color: #667eea; margin: 24px 0;">
      ${data.organizationName}
    </p>

    <p>
      You've been invited to join as a <strong>${data.roleName}</strong>.
    </p>

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        🙏 What this means:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #2d3748;">
        <li style="margin-bottom: 8px;">Access to your organization's spiritual support community</li>
        <li style="margin-bottom: 8px;">Ability to share sessions and collaborate with others</li>
        <li style="margin-bottom: 8px;">Connect with counselors and receive pastoral care</li>
        <li style="margin-bottom: 8px;">Be part of a faith-based support network</li>
      </ul>
    </div>

    <p>
      Click the button below to accept this invitation and join ${data.organizationName}:
    </p>

    ${createButtonHtml(data.acceptUrl, 'Accept Invitation')}

    ${createCalloutHtml(`This invitation will expire on ${expirationDate}. Please accept before then.`)}

    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
      <strong>Don't recognize this organization?</strong> You can safely ignore this email. If you have
      concerns, please contact our support team.
    </p>

    <hr class="divider" />

    <p style="color: #718096; font-size: 14px;">
      <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br/>
      <span style="color: #667eea; word-break: break-all;">${data.acceptUrl}</span>
    </p>

    <p style="margin-top: 24px;">
      In Christ's fellowship,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

${data.inviterName} has invited you to join their organization:

${data.organizationName}

You've been invited to join as a ${data.roleName}.

🙏 What this means:
- Access to your organization's spiritual support community
- Ability to share sessions and collaborate with others
- Connect with counselors and receive pastoral care
- Be part of a faith-based support network

Click here to accept this invitation:
${data.acceptUrl}

This invitation will expire on ${expirationDate}. Please accept before then.

Don't recognize this organization? You can safely ignore this email. If you have concerns,
please contact our support team.

In Christ's fellowship,
The ${data.appName} Team
  `.trim();

  return {
    subject: `You're invited to join ${data.organizationName}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
