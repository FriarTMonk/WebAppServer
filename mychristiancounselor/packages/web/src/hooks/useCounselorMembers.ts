import { useState, useEffect, useCallback } from 'react';
import { CounselorMemberSummary } from '@mychristiancounselor/shared';

export function useCounselorMembers(organizationId?: string) {
  const [members, setMembers] = useState<CounselorMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const url = organizationId
        ? `${apiUrl}/counsel/members?organizationId=${organizationId}`
        : `${apiUrl}/counsel/members`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }

      const data = await response.json();
      setMembers(data.members || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching counselor members:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
}
