export class SubscriptionStatusDto {
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionTier?: 'basic' | 'premium';
  maxClarifyingQuestions: number;
  hasHistoryAccess: boolean;
  hasSharingAccess: boolean;
  hasArchiveAccess: boolean;
}
