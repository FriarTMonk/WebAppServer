/**
 * SLA targets in hours based on priority level
 * All times are in business hours (Mon-Fri 10 AM - 10 PM EST)
 */
export const SLA_TARGETS = {
  urgent: {
    response: 4, // 4 hours
    resolution: 24, // 1 day
  },
  high: {
    response: 24, // 1 day
    resolution: 120, // 5 days
  },
  medium: {
    response: 72, // 3 days
    resolution: 720, // 30 days
  },
  low: {
    response: 120, // 5 days
    resolution: 2160, // 90 days
  },
  feature: {
    response: 120, // 5 days
    resolution: null, // Roadmap-driven, no SLA
  },
};

/**
 * Business hours configuration
 */
export const BUSINESS_HOURS = {
  timezone: 'America/New_York',
  startHour: 10, // 10 AM
  endHour: 22, // 10 PM
  weekdays: [1, 2, 3, 4, 5], // Monday-Friday
};

/**
 * SLA status thresholds (percentage of time elapsed)
 */
export const SLA_THRESHOLDS = {
  approaching: 60, // Yellow warning
  critical: 80, // Orange warning
  breached: 100, // Red alert
};
