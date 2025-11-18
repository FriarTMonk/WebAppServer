import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

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
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token');

      const url = organizationId
        ? `${API_URL}/counsel/members/${memberId}/observations?organizationId=${organizationId}`
        : `${API_URL}/counsel/members/${memberId}/observations`;

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
