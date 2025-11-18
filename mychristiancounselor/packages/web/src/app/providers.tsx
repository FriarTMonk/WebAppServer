'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { GlobalMorphBanner } from '../components/GlobalMorphBanner';
import { GlobalInvitationBanner } from '../components/GlobalInvitationBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GlobalMorphBanner />
      <GlobalInvitationBanner />
      {children}
    </AuthProvider>
  );
}
