import { useState, useEffect } from 'react';

export interface CounselorObservation {
  id: string;
  counselorId: string;
  memberId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function useMemberObservations(memberId: string, organizationId?: string) {
  const [observations, setObservations] = useState<CounselorObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObservations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const url = organizationId
        ? `/api/counsel/members/${memberId}/observations?organizationId=${organizationId}`
        : `/api/counsel/members/${memberId}/observations`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch observations');
      }

      const data = await response.json();
      setObservations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchObservations();
    }
  }, [memberId, organizationId]);

  return { observations, loading, error, refetch: fetchObservations };
}
