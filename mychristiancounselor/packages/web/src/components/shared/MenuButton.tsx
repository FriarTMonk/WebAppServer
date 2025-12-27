'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface MenuButtonProps {
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'disabled' | 'highlighted';
  role?: 'menuitem' | 'option' | 'button';
  className?: string;
}

export function MenuButton({
  onClick = () => {},
  children,
  disabled = false,
  variant = 'default',
  role = 'menuitem',
  className,
}: MenuButtonProps) {
  const baseClasses = 'block w-full text-left px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
  const effectiveVariant = disabled ? 'disabled' : variant;

  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-100',
    disabled: 'text-gray-400 cursor-not-allowed bg-gray-50',
    highlighted: 'text-blue-600 hover:bg-blue-50 font-medium',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role={role}
      className={clsx(baseClasses, variantClasses[effectiveVariant], className)}
    >
      {children}
    </button>
  );
}
