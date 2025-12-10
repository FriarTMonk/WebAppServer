# Email Template Samples

This directory contains branded HTML samples of all email templates used in MyChristianCounselor.

## Purpose

These samples are provided for:
- **Design Review**: Preview email designs in a browser before deployment
- **Testing**: Use as reference for email rendering tests
- **Documentation**: Show stakeholders what emails look like
- **Development**: Reference when building new templates

## Generated Samples

### Authentication Emails
- `verification-email.html` - Email verification for new users
- `password-reset-email.html` - Password reset request

### Session Management
- `session-share-email.html` - Notification when a session is shared
- `note-added-email.html` - Notification when a counselor adds a note

### Organization Management
- `counselor-assignment-member.html` - Notification to member about counselor assignment
- `counselor-assignment-counselor.html` - Notification to counselor about member assignment
- `org-invitation-email.html` - Invitation to join an organization

### Billing & Subscriptions
- `subscription-started-email.html` - Welcome email when subscription starts
- `payment-succeeded-email.html` - Confirmation of successful payment
- `payment-failed-email.html` - Alert for failed payment
- `subscription-cancelled-email.html` - Confirmation of subscription cancellation
- `renewal-reminder-email.html` - Reminder before subscription renewal
- `org-90day-reminder-email.html` - 90-day renewal reminder for organizations
- `org-30day-invoice-email.html` - 30-day invoice for organizations
- `org-suspension-notice-email.html` - Warning before account suspension
- `org-suspended-email.html` - Notification of account suspension

## How to View

Simply open any `.html` file in a web browser to preview the email design.

## Regenerating Samples

To regenerate all samples with updated designs:

\`\`\`bash
cd packages/api
npx ts-node --transpileOnly src/email/templates/generate-samples.ts
\`\`\`

## Notes

- All samples use placeholder data (names, dates, URLs, etc.)
- The actual emails sent to users will have real data populated
- These samples reflect the current branded design with purple gradient theme
- All links in samples are non-functional placeholders
