'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationView } from '../../components/ConversationView';
import { AuthGuard } from '../../components/AuthGuard';
import SecurityBanner from '../../components/SecurityBanner';
import { api } from '@/lib/api';

/**
 * Home Page - Conversation View
 *
 * Unix Principles Applied:
 * - Single purpose: Provide counseling conversation interface
 * - Authentication required: Redirects to login if not authenticated
 * - Simple: Just show the conversation view after auth check
 *
 * Requires authentication to access.
 * Redirects to login page if user is not logged in.
 */
export default function HomePage() {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState<'deployment' | '3-day' | '9-day'>('deployment');

  useEffect(() => {
    checkSecurityBanner();
  }, []);

  const checkSecurityBanner = async () => {
    try {
      const response = await api.get('/auth/2fa/status');
      const data = response.data;

      if (!data.twoFactorEnabled) {
        const banner = determineBannerType(data);
        if (banner) {
          setBannerType(banner);
          setShowBanner(true);
        }
      }
    } catch (error) {
      console.error('Failed to check banner status');
    }
  };

  const determineBannerType = (status: any): 'deployment' | '3-day' | '9-day' | null => {
    if (status.deploymentBannerDismissed === false) {
      return 'deployment';
    }

    if (!status.lastSecurityBannerShown) {
      return '3-day';
    }

    const lastShown = new Date(status.lastSecurityBannerShown);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince >= 9) {
      return '9-day';
    } else if (daysSince >= 3) {
      return '3-day';
    }

    return null;
  };

  const handleDismissBanner = async () => {
    try {
      await api.post('/auth/2fa/dismiss-banner');
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to dismiss banner');
    }
  };

  const handleEnableSecurity = () => {
    router.push('/settings/security');
  };

  return (
    <AuthGuard requireAuth redirectTo="/login">
      <div>
        {showBanner && (
          <SecurityBanner
            type={bannerType}
            onDismiss={handleDismissBanner}
            onEnable={handleEnableSecurity}
          />
        )}
        <ConversationView />
      </div>
    </AuthGuard>
  );
}
