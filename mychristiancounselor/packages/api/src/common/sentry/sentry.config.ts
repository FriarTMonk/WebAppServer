import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Free tier includes 5,000 errors per month
 *
 * ALERT CONFIGURATION (via Sentry Dashboard):
 * 1. Go to https://sentry.io/settings/[your-org]/projects/[your-project]/alerts/
 * 2. Create alert rules for:
 *    - High error rate (>10 errors in 5 minutes)
 *    - Fatal errors (level: fatal)
 *    - Startup failures (tag: startup=failed)
 *    - Database connection failures (message contains "Database")
 *    - Redis connection failures (message contains "Redis")
 * 3. Configure notification channels (Email, Slack, PagerDuty, etc.)
 */
export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  // Only initialize if DSN is provided
  if (!dsn) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Set sample rate for production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Enable debug mode in development
    debug: environment === 'development',

    // Release tracking
    release: process.env.npm_package_version || 'unknown',

    // Server name
    serverName: process.env.HOSTNAME || 'unknown',

    // Integrations
    integrations: [
      // Performance monitoring
      nodeProfilingIntegration(),

      // HTTP integration for tracing requests
      Sentry.httpIntegration(),

      // Express integration
      Sentry.expressIntegration(),
    ],

    // Add default tags for all events
    initialScope: {
      tags: {
        runtime: 'node',
        nodeVersion: process.version,
      },
      contexts: {
        runtime: {
          name: 'node',
          version: process.version,
        },
      },
    },

    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove passwords
            if (breadcrumb.data.password) {
              breadcrumb.data.password = '[Filtered]';
            }
            // Remove tokens
            if (breadcrumb.data.token) {
              breadcrumb.data.token = '[Filtered]';
            }
            // Remove API keys
            if (breadcrumb.data.apiKey) {
              breadcrumb.data.apiKey = '[Filtered]';
            }
          }
          return breadcrumb;
        });
      }

      // Remove sensitive data from request
      if (event.request) {
        if (event.request.headers) {
          // Remove authorization headers
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // HTTP errors that are expected
      'Non-Error exception captured',
      // Network errors
      'NetworkError',
      'Network request failed',
    ],

    // Ignore certain URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log(`✅ Sentry initialized for ${environment} environment`);
}
