import { BaseTemplateData } from '../interfaces/email-template.interface';

/**
 * Base HTML email template with branding and styling
 * Provides consistent look and feel across all emails
 */
export function renderBaseTemplate(content: string, data: BaseTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${data.appName}</title>
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }

    /* Base styles */
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .header-title { color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -0.5px; }
    .header-subtitle { color: #e9d8fd; font-size: 14px; margin: 8px 0 0 0; }
    .content { padding: 40px 30px; color: #2d3748; line-height: 1.6; font-size: 16px; }
    .content p { margin: 0 0 16px 0; }
    .content p:last-child { margin-bottom: 0; }
    .greeting { font-size: 18px; font-weight: 500; color: #1a202c; margin-bottom: 20px; }
    .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); }
    .button:hover { box-shadow: 0 6px 10px rgba(102, 126, 234, 0.35); }
    .footer { background-color: #f7fafc; padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #718096; font-size: 14px; margin: 0 0 12px 0; line-height: 1.5; }
    .footer-links { margin: 12px 0; }
    .footer-link { color: #667eea; text-decoration: none; margin: 0 10px; font-size: 14px; }
    .footer-link:hover { text-decoration: underline; }
    .divider { border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .callout { background-color: #edf2f7; border-left: 4px solid #667eea; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }
    .callout-text { color: #2d3748; font-size: 14px; margin: 0; }
    .highlight { background-color: #fef5e7; padding: 2px 6px; border-radius: 3px; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content { padding: 30px 20px !important; }
      .header { padding: 30px 20px !important; }
      .header-title { font-size: 24px !important; }
      .button { display: block !important; padding: 12px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f7fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 class="header-title">${data.appName}</h1>
              <p class="header-subtitle">Biblical Counseling & Spiritual Guidance</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p class="footer-text">
                You're receiving this email because you have an account with ${data.appName}.
              </p>
              <div class="footer-links">
                <a href="${data.appUrl}" class="footer-link">Visit Website</a> •
                <a href="${data.appUrl}/help" class="footer-link">Help Center</a> •
                <a href="mailto:${data.supportEmail}" class="footer-link">Contact Support</a>
              </div>
              <p class="footer-text" style="margin-top: 20px; font-size: 12px;">
                © ${data.currentYear} ${data.appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version from HTML (strips HTML tags)
 */
export function renderPlainTextVersion(content: string, data: BaseTemplateData): string {
  // Strip HTML tags and convert to plain text
  const plainText = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .trim();

  return `
${data.appName}
Biblical Counseling & Spiritual Guidance

---

${plainText}

---

You're receiving this email because you have an account with ${data.appName}.

Visit Website: ${data.appUrl}
Contact Support: ${data.supportEmail}

© ${data.currentYear} ${data.appName}. All rights reserved.
  `.trim();
}

/**
 * Helper to create a button link for emails
 */
export function createButtonHtml(url: string, text: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr>
        <td>
          <a href="${url}" class="button" target="_blank" style="color: #ffffff; text-decoration: none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Helper to create a callout box for important information
 */
export function createCalloutHtml(text: string): string {
  return `
    <div class="callout">
      <p class="callout-text">${text}</p>
    </div>
  `.trim();
}
