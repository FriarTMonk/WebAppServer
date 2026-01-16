'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { TourProvider } from '../contexts/TourContext';
import { TourRunner } from '../components/TourRunner';
import { GlobalMorphBanner } from '../components/GlobalMorphBanner';
import { GlobalInvitationBanner } from '../components/GlobalInvitationBanner';
import { GlobalSecurityBanner } from '../components/GlobalSecurityBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TourProvider>
        <GlobalMorphBanner />
        <GlobalInvitationBanner />
        <GlobalSecurityBanner />
        <TourRunner />
        {children}
      </TourProvider>
    </AuthProvider>
  );
}
