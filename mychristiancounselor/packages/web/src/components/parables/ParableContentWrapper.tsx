'use client';

import React, { useEffect, useState } from 'react';
import { ParableProvider } from '@/contexts/ParableContext';
import { apiFetch } from '@/lib/api';

interface ParableContentWrapperProps {
  slug: string;
  children: React.ReactNode;
}

export function ParableContentWrapper({ slug, children }: ParableContentWrapperProps) {
  const [parableId, setParableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch parable metadata to get the ID
    apiFetch(`/parables/${slug}`)
      .then(res => res.json())
      .then(data => {
        setParableId(data.id);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching parable metadata:', error);
        setIsLoading(false);
      });
  }, [slug]);

  if (isLoading || !parableId) {
    // Show loading state or render without context
    // ParableCTA will handle the missing context gracefully
    return <>{children}</>;
  }

  return (
    <ParableProvider parableId={parableId} parableSlug={slug}>
      {children}
    </ParableProvider>
  );
}
