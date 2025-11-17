'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { MemberProfileExportView } from '../../../../../components/MemberProfileExportView';

export default function MemberExportPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const memberId = params.memberId as string;
  const organizationId = searchParams.get('organizationId') || '';

  return (
    <MemberProfileExportView
      memberId={memberId}
      organizationId={organizationId}
    />
  );
}
