'use client';

import { useTransition, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MenuButton } from './MenuButton';
import { buildLinkWithTrail, parseTrail } from '@/lib/navigation-utils';

/** Navigation paths for resources section */
const RESOURCES_PATHS = {
  books: '/resources/books',
  readingList: '/resources/reading-list',
  parables: '/parables',
  wellnessCharts: '/resources/wellness/charts',
  organizations: '/resources/organizations',
  recommended: '/resources/recommended',
} as const;

/**
 * Props for ResourcesMenuSection component
 */
interface ResourcesMenuSectionProps {
  /** Called after successful navigation (typically to close dropdown) */
  onNavigate?: () => void;
  /** Show top border separator */
  showBorder?: boolean;
  /** Wrap content in a semantic group role */
  roleGroup?: boolean;
  /** Whether user has access to book resources (subscription or organization membership) */
  hasAccess?: boolean;
}

function ResourcesMenuSectionContent({
  onNavigate,
  showBorder = true,
  roleGroup = true,
  hasAccess = true,
}: ResourcesMenuSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const trailParam = searchParams.get('trail');
  const trail = parseTrail(trailParam);

  const handleNavigate = (path: string) => () => {
    startTransition(async () => {
      try {
        await router.push(buildLinkWithTrail(path, pathname, trail));
        onNavigate?.();
      } catch (error) {
        console.error(`Failed to navigate to ${path}:`, error);
      }
    });
  };

  const content = (
    <>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.books)}
        disabled={isPending || !hasAccess}
        variant={!hasAccess ? 'disabled' : 'default'}
      >
        Browse Books
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.readingList)}
        disabled={isPending || !hasAccess}
        variant={!hasAccess ? 'disabled' : 'default'}
      >
        My Reading List
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.parables)}
        disabled={isPending}
      >
        Parables for Today
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.wellnessCharts)}
        disabled={isPending || !hasAccess}
        variant={!hasAccess ? 'disabled' : 'default'}
      >
        Wellness Charts
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.organizations)}
        disabled={isPending}
      >
        Browse Organizations
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.recommended)}
        disabled={isPending || !hasAccess}
        variant={!hasAccess ? 'disabled' : 'default'}
      >
        Recommended for Me
      </MenuButton>
    </>
  );

  if (roleGroup) {
    return (
      <div
        className={showBorder ? 'border-t border-gray-200' : ''}
        role="group"
        aria-label="Resources"
      >
        {content}
      </div>
    );
  }

  return <>{content}</>;
}

export function ResourcesMenuSection(props: ResourcesMenuSectionProps) {
  return (
    <Suspense fallback={<div className="h-32" />}>
      <ResourcesMenuSectionContent {...props} />
    </Suspense>
  );
}
