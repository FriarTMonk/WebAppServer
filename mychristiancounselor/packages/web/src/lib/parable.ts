import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import type { ReactElement } from 'react';
import { mdxComponents } from '@/components/parables/mdx-components';

export interface Parable {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  mdxContent: ReactElement;
  category: string;
  publishedDate: string;
  readTime: string;
  scriptureReference: string;
  tags: string[];
  isFeatured: boolean;
}

const PARABLE_DIR = path.join(process.cwd(), 'content', 'parables');

// Get all parables with metadata (for listing pages)
export async function getAllParables(): Promise<Parable[]> {
  // Check if directory exists
  if (!fs.existsSync(PARABLE_DIR)) {
    return [];
  }

  const filenames = fs.readdirSync(PARABLE_DIR);

  const parablePromises = filenames
    .filter(filename => filename.endsWith('.mdx'))
    .map(filename => {
      const slug = filename.replace(/\.mdx$/, '');
      return getParable(slug);
    });

  const parables = (await Promise.all(parablePromises))
    .filter((parable): parable is Parable => parable !== undefined);

  // Filter out future parables
  const now = new Date();
  const publishedParables = parables.filter(
    parable => new Date(parable.publishedDate) <= now
  );

  // Sort by published date, newest first
  return publishedParables.sort((a, b) =>
    new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
}

// Get single parable by slug
export async function getParable(slug: string): Promise<Parable | undefined> {
  const filePath = path.join(PARABLE_DIR, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  // Compile MDX with rehype plugins and custom components
  const { content: mdxContent } = await compileMDX({
    source: content,
    components: mdxComponents,
    options: {
      parseFrontmatter: false, // We already parsed with gray-matter
      mdxOptions: {
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        ],
      },
    },
  });

  return {
    slug,
    title: data.title,
    excerpt: data.excerpt,
    content: content,  // Raw markdown
    mdxContent,        // Compiled MDX (React element)
    category: data.category,
    publishedDate: data.publishedDate,
    readTime: data.readTime,
    scriptureReference: data.scriptureReference,
    tags: data.tags || [],
    isFeatured: data.isFeatured || false,
  };
}

// Get featured parable (for homepage teaser)
export async function getFeaturedParable(): Promise<Parable | undefined> {
  const parables = await getAllParables();

  // Find the most recent featured parable
  const featured = parables.find(parable => parable.isFeatured);

  if (featured) {
    return featured;
  }

  // Fallback to most recent parable
  return parables[0];
}

// Get parables by category
export async function getParablesByCategory(category: string): Promise<Parable[]> {
  const parables = await getAllParables();
  return parables.filter(parable => parable.category === category);
}

// Get parables by tag
export async function getParablesByTag(tag: string): Promise<Parable[]> {
  const parables = await getAllParables();
  return parables.filter(parable => parable.tags.includes(tag));
}

// Get all unique categories
export async function getAllCategories(): Promise<string[]> {
  const parables = await getAllParables();
  const categories = new Set(parables.map(parable => parable.category));
  return Array.from(categories).sort();
}

// Get all unique tags
export async function getAllTags(): Promise<string[]> {
  const parables = await getAllParables();
  const tags = new Set(parables.flatMap(parable => parable.tags));
  return Array.from(tags).sort();
}
