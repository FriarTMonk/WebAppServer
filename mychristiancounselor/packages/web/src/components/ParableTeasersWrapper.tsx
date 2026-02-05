import { getRandomParables } from '@/lib/parable';
import { ParableTeasersSection } from './ParableTeasersSection';

// Cache for 1 hour (3600 seconds)
export const revalidate = 3600;

export async function ParableTeasersWrapper() {
  // Get 3 random parables (re-randomized every hour)
  const randomParables = await getRandomParables(3);

  const parableTeasers = randomParables.map(parable => ({
    slug: parable.slug,
    title: parable.title,
    category: parable.category,
    excerpt: parable.excerpt,
  }));

  return <ParableTeasersSection parables={parableTeasers} />;
}
