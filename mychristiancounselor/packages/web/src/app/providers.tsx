'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { TourProvider } from '../contexts/TourContext';
import { TourRunner } from '../components/TourRunner';
import { GlobalMorphBanner } from '../components/GlobalMorphBanner';
import { GlobalInvitationBanner } from '../components/GlobalInvitationBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TourProvider>
        <GlobalMorphBanner />
        <GlobalInvitationBanner />
        <TourRunner />
        {children}
      </TourProvider>
    </AuthProvider>
  );
}
