import { useState, useEffect } from 'react';
import { CounselorMemberSummary } from '@mychristiancounselor/shared';

export function useCounselorMembers(organizationId?: string) {
  const [members, setMembers] = useState<CounselorMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Not authenticated');
        return;
      }

      const url = organizationId
        ? `/api/counsel/members?organizationId=${organizationId}`
        : '/api/counsel/members';

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }

      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  return { members, loading, error, refetch: fetchMembers };
}
