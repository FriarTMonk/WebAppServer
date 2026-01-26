import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import type { ReactElement } from 'react';
import { mdxComponents } from '@/components/blog/mdx-components';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  mdxContent: ReactElement;
  author: string;
  publishedDate: string;
  updatedDate?: string;
  category: string;
  tags: string[];
  image?: string;
  readTime: string;
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

// Get all blog posts with metadata (for listing pages)
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  // Check if directory exists
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const filenames = fs.readdirSync(BLOG_DIR);

  const postPromises = filenames
    .filter(filename => filename.endsWith('.mdx'))
    .map(filename => {
      const slug = filename.replace(/\.mdx$/, '');
      return getBlogPost(slug);
    });

  const posts = (await Promise.all(postPromises))
    .filter((post): post is BlogPost => post !== undefined);

  // Sort by published date, newest first
  return posts.sort((a, b) =>
    new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
}

// Get single blog post by slug
export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

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
    author: data.author || 'MyChristianCounselor Online Team',
    publishedDate: data.publishedDate,
    updatedDate: data.updatedDate,
    category: data.category,
    tags: data.tags || [],
    image: data.image,
    readTime: data.readTime,
  };
}

// Get posts by category
export async function getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts.filter(post => post.category === category);
}

// Get posts by tag
export async function getBlogPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts.filter(post => post.tags.includes(tag));
}

// Get all unique categories
export async function getAllCategories(): Promise<string[]> {
  const posts = await getAllBlogPosts();
  const categories = new Set(posts.map(post => post.category));
  return Array.from(categories).sort();
}

// Get all unique tags
export async function getAllTags(): Promise<string[]> {
  const posts = await getAllBlogPosts();
  const tags = new Set(posts.flatMap(post => post.tags));
  return Array.from(tags).sort();
}
