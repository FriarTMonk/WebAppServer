'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { GlobalMorphBanner } from '../components/GlobalMorphBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GlobalMorphBanner />
      {children}
    </AuthProvider>
  );
}
