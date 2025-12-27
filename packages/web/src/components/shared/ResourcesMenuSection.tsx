'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MenuButton } from './MenuButton';

/** Navigation paths for resources section */
const RESOURCES_PATHS = {
  books: '/resources/books',
  readingList: '/resources/reading-list',
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
}

export function ResourcesMenuSection({
  onNavigate,
  showBorder = true,
  roleGroup = true,
}: ResourcesMenuSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleNavigate = (path: string) => () => {
    startTransition(async () => {
      try {
        await router.push(path);
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
        disabled={isPending}
      >
        Browse Books
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.readingList)}
        disabled={isPending}
      >
        My Reading List
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.organizations)}
        disabled={isPending}
      >
        Browse Organizations
      </MenuButton>
      <MenuButton
        onClick={handleNavigate(RESOURCES_PATHS.recommended)}
        disabled={isPending}
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
