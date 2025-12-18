// Sales Pipeline Stages
export enum SalesStage {
  PROSPECT = 'prospect',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

// Lead Source
export enum LeadSource {
  EMAIL = 'email',
  WEBSITE = 'website',
  REFERRAL = 'referral',
  COLD_OUTREACH = 'cold_outreach',
  EVENT = 'event',
  PARTNER = 'partner',
}

// Loss Reason
export enum LossReason {
  BUDGET = 'budget',
  TIMING = 'timing',
  COMPETITOR = 'competitor',
  NO_RESPONSE = 'no_response',
  NOT_QUALIFIED = 'not_qualified',
  OTHER = 'other',
}

// Sales Opportunity
export interface SalesOpportunity {
  id: string;
  title: string;
  description: string;
  createdById: string;
  assignedToId: string | null;

  // Contact information
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  organizationId: string | null;

  // Sales tracking
  stage: SalesStage;
  leadSource: LeadSource;
  dealValue: number;
  probability: number;
  priorityScore: number;

  // Timeline tracking
  estimatedCloseDate: string | null;
  firstContactAt: string | null;
  proposalSentAt: string | null;
  negotiationStartedAt: string | null;
  wonAt: string | null;
  lostAt: string | null;

  // Activity tracking
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
  followUpNotes: string | null;

  // Loss tracking
  lossReason: LossReason | null;
  lossNotes: string | null;

  createdAt: string;
  updatedAt: string;

  // Relations
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
  activities?: SalesActivity[];
  notes?: SalesNote[];
}

// Sales Activity
export interface SalesActivity {
  id: string;
  opportunityId: string;
  performedById: string;
  activityType: 'call' | 'email' | 'meeting' | 'demo' | 'proposal';
  subject: string;
  notes: string | null;
  duration: number | null;
  outcome: 'positive' | 'neutral' | 'negative' | 'no_response' | null;
  nextFollowUpAt: string | null;
  createdAt: string;

  performedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Sales Note
export interface SalesNote {
  id: string;
  opportunityId: string;
  authorId: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;

  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Sales Metrics (for dashboard)
export interface SalesMetrics {
  pipelineValue: number;        // Sum of (dealValue × probability) for qualified+ deals
  activeOpportunities: number;  // Count of prospect/qualified/proposal/negotiation
  avgDealSize: number;          // Avg dealValue for won deals (last 90 days)
  winRate: number;              // % of won / (won + lost) (last 90 days)
  avgSalesCycle: number;        // Avg days from creation to won (last 90 days)
  forecastedRevenue: number;    // Sum of (dealValue × probability) for deals closing this month
}

// Sales Queue Filters
export interface SalesQueueFilters {
  stage?: SalesStage;
  leadSource?: LeadSource;
  assignmentFilter?: 'all' | 'unassigned' | 'assigned';
  sortBy?: 'priorityScore' | 'dealValue' | 'probability' | 'createdAt' | 'estimatedCloseDate';
  page?: number;
  pageSize?: number;
}

// Sales Queue Response
export interface SalesQueueResponse {
  opportunities: SalesOpportunity[];
  total: number;
  page: number;
  pageSize: number;
}
