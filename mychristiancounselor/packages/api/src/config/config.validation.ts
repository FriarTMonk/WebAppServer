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
  POSTMARK_API_TOKEN: Joi.string().required(),
  FROM_EMAIL: Joi.string().email().required(),
  SUPPORT_EMAIL: Joi.string().email().required(),

  // AI Services
  OPENAI_API_KEY: Joi.string().required(),
  ANTHROPIC_API_KEY: Joi.string().required(),

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
