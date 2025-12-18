import React from 'react';

export type SalesStage = 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface StageBadgeProps {
  stage: SalesStage;
  className?: string;
}

const stageConfig: Record<SalesStage, { label: string; color: string; bgColor: string; borderColor: string }> = {
  prospect: {
    label: 'Prospect',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  qualified: {
    label: 'Qualified',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  proposal: {
    label: 'Proposal',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  won: {
    label: 'Won',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  lost: {
    label: 'Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
};

export function StageBadge({ stage, className = '' }: StageBadgeProps) {
  const config = stageConfig[stage] || stageConfig.prospect;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.bgColor === 'bg-gray-100' ? 'bg-gray-500' : config.bgColor === 'bg-blue-100' ? 'bg-blue-500' : config.bgColor === 'bg-yellow-100' ? 'bg-yellow-500' : config.bgColor === 'bg-orange-100' ? 'bg-orange-500' : config.bgColor === 'bg-green-100' ? 'bg-green-500' : 'bg-red-500'}`}></span>
      {config.label}
    </span>
  );
}
