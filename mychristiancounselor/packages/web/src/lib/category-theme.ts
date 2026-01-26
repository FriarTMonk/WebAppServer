export type BlogCategory =
  | 'Mental Health'
  | 'Relationships'
  | 'Faith & Spirituality'
  | 'Parenting'
  | 'Recovery'
  | 'Addiction';

export interface CategoryTheme {
  gradient: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export function getCategoryTheme(category: string): CategoryTheme {
  const themes: Record<string, CategoryTheme> = {
    'Mental Health': {
      gradient: 'from-teal-500 to-teal-700',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-800',
      borderColor: 'border-teal-500',
    },
    'Relationships': {
      gradient: 'from-rose-400 to-rose-600',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      borderColor: 'border-rose-500',
    },
    'Faith & Spirituality': {
      gradient: 'from-amber-400 to-amber-600',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      borderColor: 'border-amber-500',
    },
    'Parenting': {
      gradient: 'from-lime-500 to-lime-700',
      badgeBg: 'bg-lime-100',
      badgeText: 'text-lime-800',
      borderColor: 'border-lime-500',
    },
    'Recovery': {
      gradient: 'from-purple-500 to-purple-700',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      borderColor: 'border-purple-500',
    },
    'Addiction': {
      gradient: 'from-purple-500 to-purple-700',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      borderColor: 'border-purple-500',
    },
  };

  return themes[category] || themes['Mental Health'];
}
