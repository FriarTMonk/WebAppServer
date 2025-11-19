/**
 * Email service configuration
 */
export interface EmailConfig {
  postmarkApiKey: string;
  fromEmail: string;
  fromName: string;
  mockMode: boolean; // If true, don't send real emails
  appUrl: string;
  appName: string;
  supportEmail: string;
}

/**
 * Email send options
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag?: string; // Postmark tag for categorization
  metadata?: Record<string, any>; // Additional data to store in EmailLog
  userId?: string; // User ID for tracking
  emailType: string; // Type of email for tracking
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string; // Postmark message ID
  error?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until next attempt allowed
  currentCount?: number;
  limit?: number;
}
