import * as Joi from 'joi';

/**
 * Environment configuration validation schema
 * Validates all required environment variables at application startup
 * Based on Unix principle: Fail fast with clear error messages
 */
export const configValidationSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // Email Service (Postmark)
  POSTMARK_API_KEY: Joi.string().optional(), // Optional because mock mode is default
  POSTMARK_FROM_EMAIL: Joi.string().email().default('noreply@mychristiancounselor.com'),
  POSTMARK_FROM_NAME: Joi.string().default('MyChristianCounselor'),
  POSTMARK_MOCK_MODE: Joi.string().valid('true', 'false').default('true'),
  SUPPORT_EMAIL: Joi.string().email().default('support@mychristiancounselor.com'),

  // AI Services - AWS Bedrock (HIPAA-compliant)
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_REGION: Joi.string().default('us-east-1'),

  // Payment Service (Stripe)
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),

  // Application URLs
  WEB_APP_URL: Joi.string().uri().default('http://localhost:3699'),
  CORS_ORIGIN: Joi.string().uri().default('http://localhost:3699'),

  // Application Configuration
  APP_NAME: Joi.string().default('MyChristianCounselor'),
  PORT: Joi.number().default(3697),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
});
