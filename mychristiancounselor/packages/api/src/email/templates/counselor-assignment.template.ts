import { EmailTemplate, CounselorAssignmentEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Counselor assignment notification email template
 * Two versions: one for member, one for counselor
 */
export function renderCounselorAssignmentEmail(data: CounselorAssignmentEmailData): EmailTemplate {
  if (data.isForMember) {
    return renderMemberAssignmentEmail(data);
  } else {
    return renderCounselorAssignmentEmail_ToCounselor(data);
  }
}

/**
 * Email to member when counselor is assigned to them
 */
function renderMemberAssignmentEmail(data: CounselorAssignmentEmailData): EmailTemplate {
  const content = `
    <p class="greeting">Hi ${data.recipientName},</p>

    <p>
      We're excited to let you know that <strong>${data.counselorName}</strong> has been assigned
      as your counselor through ${data.organizationName}.
    </p>

    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #065f46; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        🙏 What this means for you:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
        <li style="margin-bottom: 8px;">Your counselor can view your session history and reflections</li>
        <li style="margin-bottom: 8px;">They can add notes of encouragement and guidance to your sessions</li>
        <li style="margin-bottom: 8px;">You'll be able to see their notes and respond in your journal</li>
        <li style="margin-bottom: 8px;">They're committed to walking alongside you in prayer and support</li>
      </ul>
    </div>

    <p>
      Having a counselor means you have someone intentionally praying for you, reflecting on your
      journey, and ready to offer biblical wisdom when you need it most.
    </p>

    ${createButtonHtml(data.dashboardUrl, 'Go to My Dashboard')}

    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
      <strong>Your privacy matters:</strong> Your counselor sees your sessions and shared notes,
      but your account remains secure and under your control.
    </p>

    <p style="margin-top: 24px;">
      May you be encouraged,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName},

We're excited to let you know that ${data.counselorName} has been assigned as your counselor
through ${data.organizationName}.

🙏 What this means for you:
- Your counselor can view your session history and reflections
- They can add notes of encouragement and guidance to your sessions
- You'll be able to see their notes and respond in your journal
- They're committed to walking alongside you in prayer and support

Having a counselor means you have someone intentionally praying for you, reflecting on your
journey, and ready to offer biblical wisdom when you need it most.

Go to your dashboard:
${data.dashboardUrl}

Your privacy matters: Your counselor sees your sessions and shared notes, but your account
remains secure and under your control.

May you be encouraged,
The ${data.appName} Team
  `.trim();

  return {
    subject: `Meet your counselor - ${data.counselorName}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}

/**
 * Email to counselor when they're assigned to a member
 */
function renderCounselorAssignmentEmail_ToCounselor(data: CounselorAssignmentEmailData): EmailTemplate {
  const content = `
    <p class="greeting">Hi ${data.recipientName},</p>

    <p>
      You've been assigned to support <strong>${data.memberName}</strong> as their counselor
      through ${data.organizationName}.
    </p>

    <div style="background-color: #edf2f7; border-left: 4px solid: #667eea; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #2d3748; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        📋 Your access and responsibilities:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #2d3748;">
        <li style="margin-bottom: 8px;">View their complete session history and journal entries</li>
        <li style="margin-bottom: 8px;">Add notes of encouragement, guidance, and prayer</li>
        <li style="margin-bottom: 8px;">Monitor their wellbeing status and AI-detected concerns</li>
        <li style="margin-bottom: 8px;">Respond thoughtfully to their spiritual questions and struggles</li>
      </ul>
    </div>

    <p>
      This is a sacred trust. ${data.memberName} has shared their innermost thoughts and spiritual
      journey with you. Please approach with prayer, wisdom, and compassion.
    </p>

    ${createButtonHtml(data.dashboardUrl, 'View Counselor Dashboard')}

    <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>⚠️ Confidentiality reminder:</strong> All information you access is confidential.
        Please honor HIPAA guidelines and your organization's privacy policies.
      </p>
    </div>

    <p style="margin-top: 24px;">
      Thank you for your ministry,<br/>
      <strong>The ${data.appName} Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.recipientName},

You've been assigned to support ${data.memberName} as their counselor through ${data.organizationName}.

📋 Your access and responsibilities:
- View their complete session history and journal entries
- Add notes of encouragement, guidance, and prayer
- Monitor their wellbeing status and AI-detected concerns
- Respond thoughtfully to their spiritual questions and struggles

This is a sacred trust. ${data.memberName} has shared their innermost thoughts and spiritual
journey with you. Please approach with prayer, wisdom, and compassion.

View your counselor dashboard:
${data.dashboardUrl}

⚠️ Confidentiality reminder: All information you access is confidential. Please honor HIPAA
guidelines and your organization's privacy policies.

Thank you for your ministry,
The ${data.appName} Team
  `.trim();

  return {
    subject: `You've been assigned to support ${data.memberName}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
