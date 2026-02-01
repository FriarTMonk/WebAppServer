import { getAllParables } from '@/lib/parable';
import { ParableTeasersSection } from './ParableTeasersSection';

export async function ParableTeasersWrapper() {
  const allParables = await getAllParables();

  // Get the 3 most recent parables
  const recentParables = allParables.slice(0, 3).map(parable => ({
    slug: parable.slug,
    title: parable.title,
    category: parable.category,
    excerpt: parable.excerpt,
  }));

  return <ParableTeasersSection parables={recentParables} />;
}
