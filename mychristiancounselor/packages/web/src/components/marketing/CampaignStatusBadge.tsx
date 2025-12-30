interface CampaignStatusBadgeProps {
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Draft', className: 'bg-gray-100 text-gray-800' };
      case 'scheduled':
        return { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' };
      case 'sending':
        return { label: 'Sending', className: 'bg-yellow-100 text-yellow-800' };
      case 'sent':
        return { label: 'Sent', className: 'bg-green-100 text-green-800' };
      case 'failed':
        return { label: 'Failed', className: 'bg-red-100 text-red-800' };
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
