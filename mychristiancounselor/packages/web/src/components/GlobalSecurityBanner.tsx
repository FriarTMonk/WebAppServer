'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SecurityBanner } from './SecurityBanner';
import { api } from '@/lib/api';

/**
 * GlobalSecurityBanner component that displays security encouragement banners
 * for users who haven't enabled 2FA.
 *
 * This should be added to the root providers to show globally across all pages.
 */
export function GlobalSecurityBanner() {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState<'deployment' | '3-day' | '9-day'>('deployment');
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
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
    await api.post('/auth/2fa/dismiss-banner');
    setShowBanner(false);
  };

  const handleEnableSecurity = () => {
    router.push('/settings/security');
  };

  // Don't render anything if loading or not showing banner
  if (isLoading || !showBanner) {
    return null;
  }

  return (
    <SecurityBanner
      type={bannerType}
      onDismiss={handleDismissBanner}
      onEnable={handleEnableSecurity}
    />
  );
}
