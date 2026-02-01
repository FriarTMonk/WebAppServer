'use client';

import React, { createContext, useContext } from 'react';

interface ParableContextType {
  parableId: string;
  parableSlug: string;
}

const ParableContext = createContext<ParableContextType | undefined>(undefined);

export function ParableProvider({
  parableId,
  parableSlug,
  children,
}: {
  parableId: string;
  parableSlug: string;
  children: React.ReactNode;
}) {
  return (
    <ParableContext.Provider value={{ parableId, parableSlug }}>
      {children}
    </ParableContext.Provider>
  );
}

export function useParableContext() {
  const context = useContext(ParableContext);
  return context;
}
