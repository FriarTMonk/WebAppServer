import { EmailTemplate, CrisisAlertEmailData } from '../interfaces/email-template.interface';
import { renderBaseTemplate, renderPlainTextVersion, createButtonHtml } from './base.template';

/**
 * Crisis alert email template
 * HIGH PRIORITY - Sent to counselors when crisis indicators detected
 */
export function renderCrisisAlertEmail(data: CrisisAlertEmailData): EmailTemplate {
  const greeting = `<p class="greeting">Hi ${data.counselorName},</p>`;

  // Map detection method to readable text
  const detectionMethodText = {
    pattern: 'keyword pattern matching',
    ai: 'AI analysis',
    both: 'keyword patterns and AI analysis',
  }[data.detectionMethod] || data.detectionMethod;

  // Map confidence to visual indicator
  const confidenceColor = {
    high: '#dc2626', // red
    medium: '#f59e0b', // amber
    low: '#3b82f6', // blue
  }[data.confidence.toLowerCase()] || '#6b7280';

  const content = `
    ${greeting}

    <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #991b1b; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">
        🚨 Crisis Alert
      </p>
      <p style="color: #7f1d1d; font-size: 14px; margin: 0;">
        This is an urgent notification requiring your immediate attention.
      </p>
    </div>

    <p>
      Our system has detected potential <strong style="color: #dc2626;">${data.crisisType}</strong>
      indicators in a conversation with <strong>${data.memberName}</strong>.
    </p>

    <div style="background-color: #fafafa; border-radius: 6px; padding: 16px; margin: 20px 0; border-left: 4px solid ${confidenceColor};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px; width: 140px;">
            <strong>Confidence Level:</strong>
          </td>
          <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">
            <span style="display: inline-block; padding: 4px 12px; background-color: ${confidenceColor}; color: white; border-radius: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase;">
              ${data.confidence}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px;">
            <strong>Detection Method:</strong>
          </td>
          <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">
            ${detectionMethodText}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px;">
            <strong>Member Email:</strong>
          </td>
          <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">
            <a href="mailto:${data.memberEmail}" style="color: #667eea; text-decoration: none;">
              ${data.memberEmail}
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-weight: 600; color: #1e293b; margin: 24px 0 12px 0;">
      Triggering Message:
    </p>
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 4px;">
      <p style="color: #78350f; font-size: 14px; margin: 0; font-style: italic; line-height: 1.6;">
        "${data.triggeringMessage}"
      </p>
    </div>

    ${createButtonHtml(data.conversationUrl, 'View Full Conversation')}

    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
        📋 Immediate Action Steps:
      </p>
      <ol style="color: #1e3a8a; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Review the full conversation context immediately</li>
        <li>Assess the severity and urgency of the situation</li>
        <li>Contact the member directly via phone or secure message</li>
        <li>If immediate danger: Contact emergency services (988 Suicide & Crisis Lifeline)</li>
        <li>Document your assessment and actions taken in the member's file</li>
      </ol>
    </div>

    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 24px 0;">
      <p style="color: #78350f; font-size: 13px; margin: 0; line-height: 1.6;">
        <strong>⚠️ Important:</strong> This is an automated alert. Always use your professional judgment
        when assessing crisis situations. When in doubt, err on the side of caution and escalate to
        appropriate mental health professionals or emergency services.
      </p>
    </div>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${data.memberProfileUrl}" style="color: #667eea; text-decoration: none; font-size: 14px;">
        View Member Profile →
      </a>
    </p>

    <p style="margin-top: 32px; color: #64748b; font-size: 14px;">
      Crisis Resources:<br/>
      <strong style="color: #1e293b;">988 Suicide & Crisis Lifeline:</strong> Call or text 988<br/>
      <strong style="color: #1e293b;">Crisis Text Line:</strong> Text HOME to 741741<br/>
      <strong style="color: #1e293b;">National Domestic Violence Hotline:</strong> 1-800-799-7233
    </p>

    <p style="margin-top: 24px;">
      In watchful care,<br/>
      <strong>The ${data.appName} Crisis Detection Team</strong>
    </p>
  `;

  const plainTextContent = `
Hi ${data.counselorName},

🚨 CRISIS ALERT - IMMEDIATE ATTENTION REQUIRED

Our system has detected potential ${data.crisisType} indicators in a conversation with ${data.memberName}.

DETAILS:
- Confidence Level: ${data.confidence.toUpperCase()}
- Detection Method: ${detectionMethodText}
- Member Email: ${data.memberEmail}

TRIGGERING MESSAGE:
"${data.triggeringMessage}"

View Full Conversation:
${data.conversationUrl}

📋 IMMEDIATE ACTION STEPS:
1. Review the full conversation context immediately
2. Assess the severity and urgency of the situation
3. Contact the member directly via phone or secure message
4. If immediate danger: Contact emergency services (988 Suicide & Crisis Lifeline)
5. Document your assessment and actions taken in the member's file

⚠️ IMPORTANT: This is an automated alert. Always use your professional judgment when assessing crisis situations. When in doubt, err on the side of caution and escalate to appropriate mental health professionals or emergency services.

View Member Profile:
${data.memberProfileUrl}

CRISIS RESOURCES:
- 988 Suicide & Crisis Lifeline: Call or text 988
- Crisis Text Line: Text HOME to 741741
- National Domestic Violence Hotline: 1-800-799-7233

In watchful care,
The ${data.appName} Crisis Detection Team
  `.trim();

  return {
    subject: `🚨 URGENT: Crisis Alert - ${data.memberName}`,
    html: renderBaseTemplate(content, data),
    text: renderPlainTextVersion(plainTextContent, data),
  };
}
