import { EmailTemplate, NoteAddedEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Note added notification email template
 * Sent when someone adds a note to a counseling session
 */
export function renderNoteAddedEmail(data: NoteAddedEmailData): EmailTemplate {
  const greeting = data.recipientName
    ? `<p class="greeting">Hi ${data.recipientName},</p>`
    : `<p class="greeting">Hello,</p>`;

  const content = `
    ${greeting}

    <p>
      <strong>${data.authorName}</strong> added a note to your counseling session:
    </p>

    <p style="text-align: center; font-size: 18px; font-weight: 600; color: #667eea; margin: 20px 0;">
      "${data.sessionTitle}"
    </p>

    <p>
      Notes are a way for you and those walking with you to reflect, encourage, and pray together.
      Take a moment to read what they've shared.
    </p>

    ${createButtonHtml(data.sessionUrl, 'View Note')}

    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #065f46; font-size: 14px; margin: 0;">
        <strong>💚 Journaling together</strong> strengthens your spiritual journey. Consider responding
        with your own thoughts, prayers, or reflections.
      </p>
    </div>

    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
      You can manage your notification preferences in your account settings if you'd like to adjust
      how often you receive these updates.
    </p>

    <p style="margin-top: 24px;">
      In fellowship,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName || 'there'},

${data.authorName} added a note to your counseling session:

"${data.sessionTitle}"

Notes are a way for you and those walking with you to reflect, encourage, and pray together.
Take a moment to read what they've shared.

View the note here:
${data.sessionUrl}

💚 Journaling together strengthens your spiritual journey. Consider responding with your own
thoughts, prayers, or reflections.

You can manage your notification preferences in your account settings if you'd like to adjust
how often you receive these updates.

In fellowship,
The ${data.appName} Team
  `.trim();

  return {
    subject: `New note added to your counseling session`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
