/**
 * Page Tour Definitions
 *
 * Unix Principles:
 * - Single source of truth: All tour definitions in one place
 * - Clear naming: Tour IDs match page paths
 * - Separation: Tours are data, not logic
 */

interface TourStep {
  target: string;
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const TOUR_IDS = {
  HOME: 'home-tour',
  ADMIN: 'admin-tour',
  ORG_ADMIN: 'org-admin-tour',
  COUNSEL: 'counsel-tour',
  PROFILE: 'profile-tour',
  HISTORY: 'history-tour',
} as const;

export const homeTourSteps: TourStep[] = [
  {
    target: 'body',
    content: 'Welcome to MyChristianCounselor! This tour will guide you through the conversation interface where you can receive biblical counseling and spiritual guidance.',
    placement: 'center',
  },
  {
    target: '.conversation-container',
    content: 'This is your conversation space. Messages appear here as you chat with your AI Christian counselor.',
  },
  {
    target: '.message-input',
    content: 'Type your questions, concerns, or prayer requests here. Our AI counselor will provide biblical guidance and scripture references.',
  },
  {
    target: '.translation-selector',
    content: 'Choose your preferred Bible translation. This affects which translation is used for scripture references in responses.',
  },
  {
    target: '.comparison-mode-toggle',
    content: 'Enable comparison mode to see scripture references in multiple translations side-by-side for deeper study.',
  },
  {
    target: '.user-menu',
    content: 'Access your profile, journal, and other features from this menu.',
  },
  {
    target: '.session-notes-button',
    content: 'Take private notes during your conversation. Notes are only visible to you and can help track your spiritual journey.',
  },
];

export const adminTourSteps: TourStep[] = [
  {
    target: 'body',
    content: 'Welcome to the Platform Admin Dashboard. This tour will show you all the tools for managing MyChristianCounselor.',
    placement: 'center',
  },
  {
    target: '[data-tour="active-users-card"]',
    content: 'View active users across the platform, broken down by individual and organization accounts.',
  },
  {
    target: '[data-tour="total-users-card"]',
    content: 'Total registered users on the platform.',
  },
  {
    target: '[data-tour="organizations-card"]',
    content: 'Organization metrics showing trial, active, and expired accounts.',
  },
  {
    target: '[data-tour="sla-health"]',
    content: 'Monitor SLA compliance for support tickets. See breached and critical tickets that need immediate attention.',
  },
  {
    target: '[data-tour="performance-metrics"]',
    content: 'Platform performance metrics including uptime, response times, and error rates.',
  },
  {
    target: '[data-tour="refresh-button"]',
    content: 'Click here to refresh all metrics and see the latest data.',
  },
];

export const orgAdminTourSteps: TourStep[] = [
  {
    target: 'body',
    content: 'Welcome to the Organization Admin Dashboard. Manage your organization\'s members, licenses, and counselors here.',
    placement: 'center',
  },
  {
    target: '[data-tour="active-members-card"]',
    content: 'Number of members who have been active in the last 7 days.',
  },
  {
    target: '[data-tour="counseling-sessions-card"]',
    content: 'Total number of counseling sessions in your organization.',
  },
  {
    target: '[data-tour="license-utilization-card"]',
    content: 'Track how many of your organization\'s licenses are being used. Consider upgrading when utilization is high.',
  },
  {
    target: '[data-tour="view-members-button"]',
    content: 'Click here to manage your organization members, assign counselors, and view member activity.',
  },
  {
    target: '.org-admin-sidebar',
    content: 'Use the sidebar to navigate between members, counselor assignments, and audit logs.',
  },
];

export const counselTourSteps: TourStep[] = [
  {
    target: 'body',
    content: 'Welcome to the Counselor Dashboard. This is your command center for monitoring and supporting your assigned members.',
    placement: 'center',
  },
  {
    target: '[data-tour="member-list"]',
    content: 'View all members assigned to you. The stoplight indicator shows their current wellbeing status.',
  },
  {
    target: '[data-tour="stoplight-indicator"]',
    content: 'Stoplight Status: 🟢 Green = Healthy, 🟡 Yellow = Needs Attention, 🔴 Red = Crisis. This AI-powered assessment helps you prioritize.',
  },
  {
    target: '[data-tour="last-active"]',
    content: 'See when each member was last active to identify those who may need outreach.',
  },
  {
    target: '[data-tour="session-count"]',
    content: 'Total number of counseling sessions for this member.',
  },
  {
    target: '[data-tour="view-profile-button"]',
    content: 'Click to view detailed member profile, conversation history, and observations.',
  },
  {
    target: '[data-tour="refresh-analysis-button"]',
    content: 'Manually trigger a new AI wellbeing analysis for a member.',
  },
  {
    target: '[data-tour="override-status-button"]',
    content: 'Override the AI-suggested status with your professional judgment.',
  },
  {
    target: '[data-tour="observations-panel"]',
    content: 'Add private counselor observations that track member progress over time.',
  },
];

export const profileTourSteps: TourStep[] = [
  {
    target: 'body',
    content: 'Welcome to your Profile page. Manage your personal information, preferences, and subscriptions here.',
    placement: 'center',
  },
  {
    target: '[data-tour="personal-info"]',
    content: 'View and edit your personal information including name and email.',
  },
  {
    target: '[data-tour="bible-translation-prefs"]',
    content: 'Set your preferred Bible translation and select multiple translations for comparison mode.',
  },
  {
    target: '[data-tour="password-section"]',
    content: 'Change your password here. You\'ll need to enter your current password for security.',
  },
  {
    target: '[data-tour="subscription-section"]',
    content: 'Manage your subscription plan and billing information.',
  },
  {
    target: '[data-tour="organizations-section"]',
    content: 'View all organizations you\'re a member of and your role in each.',
  },
  {
    target: '[data-tour="counselors-section"]',
    content: 'See all counselors assigned to you across your organizations.',
  },
  {
    target: '[data-tour="danger-zone"]',
    content: 'Account deletion: This will deactivate your account immediately with a 30-day grace period before permanent deletion.',
  },
];

export const historyTourSteps: TourStep[] = [
  {
    target: 'body',
    content: 'Welcome to your Conversation Journal. Review, search, and manage all your past conversations here.',
    placement: 'center',
  },
  {
    target: '[data-tour="search-box"]',
    content: 'Search through all your conversations by keywords, topics, or content.',
  },
  {
    target: '[data-tour="date-filters"]',
    content: 'Filter conversations by date range to find specific time periods.',
  },
  {
    target: '[data-tour="active-archived-tabs"]',
    content: 'Toggle between active and archived conversations. Archived conversations are scheduled for deletion in 30 days.',
  },
  {
    target: '[data-tour="conversation-card"]',
    content: 'Click on any conversation to view the full transcript with all messages and scripture references.',
  },
  {
    target: '[data-tour="note-badge"]',
    content: 'This badge shows how many personal notes you\'ve added to this conversation.',
  },
  {
    target: '[data-tour="share-button"]',
    content: 'Share a conversation with your counselor or another trusted person.',
  },
  {
    target: '[data-tour="archive-button"]',
    content: 'Archive conversations you no longer need. They can be restored within 30 days.',
  },
  {
    target: '[data-tour="notes-panel"]',
    content: 'When viewing a conversation, use the notes panel to add private reflections and insights.',
  },
  {
    target: '[data-tour="print-button"]',
    content: 'Print or save conversations as PDF for offline reference or sharing with your counselor.',
  },
];

// Helper function to get tour steps by page path
export function getTourForPage(pathname: string): { tourId: string; steps: TourStep[] } | null {
  if (pathname === '/home' || pathname === '/') {
    return { tourId: TOUR_IDS.HOME, steps: homeTourSteps };
  }
  if (pathname.startsWith('/admin')) {
    return { tourId: TOUR_IDS.ADMIN, steps: adminTourSteps };
  }
  if (pathname.startsWith('/org-admin')) {
    return { tourId: TOUR_IDS.ORG_ADMIN, steps: orgAdminTourSteps };
  }
  if (pathname.startsWith('/counsel')) {
    return { tourId: TOUR_IDS.COUNSEL, steps: counselTourSteps };
  }
  if (pathname === '/profile') {
    return { tourId: TOUR_IDS.PROFILE, steps: profileTourSteps };
  }
  if (pathname === '/history') {
    return { tourId: TOUR_IDS.HISTORY, steps: historyTourSteps };
  }
  return null;
}

// Get page name for display
export function getPageName(tourId: string): string {
  switch (tourId) {
    case TOUR_IDS.HOME:
      return 'Home';
    case TOUR_IDS.ADMIN:
      return 'Admin';
    case TOUR_IDS.ORG_ADMIN:
      return 'Organization Admin';
    case TOUR_IDS.COUNSEL:
      return 'Counselor Dashboard';
    case TOUR_IDS.PROFILE:
      return 'Profile';
    case TOUR_IDS.HISTORY:
      return 'Conversation Journal';
    default:
      return 'Page';
  }
}
