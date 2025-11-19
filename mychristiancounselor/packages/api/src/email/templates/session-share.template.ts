import { EmailTemplate, SessionShareEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Session share notification email template
 * Sent when someone shares a counseling session
 */
export function renderSessionShareEmail(data: SessionShareEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  // Format topics list
  const topicsList = data.sessionTopics.length > 0
    ? `
    <p><strong>Topics discussed:</strong></p>
    <ul style="margin: 12px 0; padding-left: 20px; color: #2d3748;">
      ${data.sessionTopics.map(topic => `<li style="margin-bottom: 6px;">${topic}</li>`).join('')}
    </ul>
    `
    : '';

  const expirationNote = data.expiresAt
    ? `<p style="color: #718096; font-size: 14px;">This shared session will expire on ${data.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>`
    : '';

  const content = `
    ${greeting}

    <p>
      <strong>${data.senderName}</strong> has shared a counseling session with you titled:
    </p>

    <p style="text-align: center; font-size: 18px; font-weight: 600; color: #667eea; margin: 20px 0;">
      "${data.sessionTitle}"
    </p>

    ${topicsList}

    <p>
      They've invited you to view their conversation and reflections. This is a sacred act of trust
      and vulnerability. Please approach this with prayer and compassion.
    </p>

    ${createButtonHtml(data.shareUrl, 'View Shared Session')}

    <div style="background-color: #edf2f7; border-left: 4px solid #667eea; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 14px; margin: 0;">
        <strong>💡 Remember:</strong> Shared sessions are confidential. Please honor this trust by keeping
        what you read private and responding with grace.
      </p>
    </div>

    ${expirationNote}

    <p style="margin-top: 24px;">
      Walking alongside you,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

${data.senderName} has shared a counseling session with you titled:

"${data.sessionTitle}"

${data.sessionTopics.length > 0 ? `\nTopics discussed:\n${data.sessionTopics.map(t => `- ${t}`).join('\n')}\n` : ''}

They've invited you to view their conversation and reflections. This is a sacred act of trust
and vulnerability. Please approach this with prayer and compassion.

View the shared session here:
${data.shareUrl}

💡 Remember: Shared sessions are confidential. Please honor this trust by keeping what you read
private and responding with grace.

${data.expiresAt ? `This shared session will expire on ${data.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.` : ''}

Walking alongside you,
The ${data.appName} Team
  `.trim();

  return {
    subject: `${data.senderName} shared a counseling session with you`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
