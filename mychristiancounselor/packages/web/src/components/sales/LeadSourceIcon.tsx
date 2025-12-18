import React from 'react';

export type LeadSource = 'email' | 'website' | 'referral' | 'cold_outreach' | 'event' | 'partner';

interface LeadSourceIconProps {
  source: LeadSource;
  showLabel?: boolean;
  className?: string;
}

const sourceConfig: Record<LeadSource, { icon: string; label: string }> = {
  email: { icon: '📧', label: 'Email' },
  website: { icon: '🌐', label: 'Website' },
  referral: { icon: '👥', label: 'Referral' },
  cold_outreach: { icon: '📞', label: 'Cold Outreach' },
  event: { icon: '🎪', label: 'Event' },
  partner: { icon: '🤝', label: 'Partner' },
};

export function LeadSourceIcon({ source, showLabel = false, className = '' }: LeadSourceIconProps) {
  const config = sourceConfig[source] || sourceConfig.email;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-base" title={config.label}>
        {config.icon}
      </span>
      {showLabel && <span className="text-sm text-gray-700">{config.label}</span>}
    </span>
  );
}
