'use client';

import { useRouter } from 'next/navigation';
import { MenuButton } from './MenuButton';

interface ResourcesMenuSectionProps {
  onNavigate?: () => void; // Called after navigation (to close dropdown)
  showBorder?: boolean; // Show top border
  roleGroup?: boolean; // Wrap in role="group"
}

export function ResourcesMenuSection({
  onNavigate,
  showBorder = true,
  roleGroup = true,
}: ResourcesMenuSectionProps) {
  const router = useRouter();

  const handleNavigate = (path: string) => () => {
    router.push(path);
    onNavigate?.();
  };

  const content = (
    <>
      <MenuButton onClick={handleNavigate('/resources/books')}>
        Browse Books
      </MenuButton>
      <MenuButton onClick={handleNavigate('/resources/reading-list')}>
        My Reading List
      </MenuButton>
      <MenuButton onClick={handleNavigate('/resources/organizations')}>
        Browse Organizations
      </MenuButton>
      <MenuButton onClick={handleNavigate('/resources/recommended')}>
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
