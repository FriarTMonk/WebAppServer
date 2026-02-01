import { getFeaturedParable } from '@/lib/parable';
import { TodaysParableTeaser } from './TodaysParableTeaser';

export async function TodaysParableTeaserWrapper() {
  const parable = await getFeaturedParable();

  if (!parable) {
    return null;
  }

  return (
    <TodaysParableTeaser
      parable={{
        slug: parable.slug,
        title: parable.title,
        excerpt: parable.excerpt,
        category: parable.category,
      }}
    />
  );
}
