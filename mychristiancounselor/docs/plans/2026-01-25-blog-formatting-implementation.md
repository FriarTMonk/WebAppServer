# Blog Formatting System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform blog from basic MDX rendering to rich, interactive reading experience with custom components, enhanced typography, and mobile optimization.

**Architecture:** Replace remark-html pipeline with next-mdx-remote for full React component support in MDX. Build 6 custom components (Scripture, KeyTakeaway, ApplicationStep, CallToAction, Warning, PrayerPrompt) and 4 interactive features (TOC, progress bar, copy links, scroll-to-top). Apply refined spiritual visual design with category theming.

**Tech Stack:** next-mdx-remote, rehype-slug, rehype-autolink-headings, React 19, Next.js 16, Tailwind CSS, TypeScript

---

## Phase 1: MDX Infrastructure

### Task 1: Install Dependencies

**Files:**
- Modify: `packages/web/package.json`
- Modify: `package-lock.json` (auto-generated)

**Step 1: Install next-mdx-remote and rehype plugins**

Run:
```bash
cd packages/web
npm install next-mdx-remote rehype-slug rehype-autolink-headings
```

Expected: Dependencies added to package.json and installed

**Step 2: Verify installation**

Run:
```bash
npm list next-mdx-remote rehype-slug rehype-autolink-headings
```

Expected: All three packages listed with versions

**Step 3: Commit**

```bash
git add packages/web/package.json package-lock.json
git commit -m "deps: add next-mdx-remote and rehype plugins for blog formatting"
```

---

### Task 2: Update blog.ts for MDX Serialization

**Files:**
- Modify: `packages/web/src/lib/blog.ts:60-65`

**Step 1: Update imports**

Replace:
```typescript
import { remark } from 'remark';
import html from 'remark-html';
```

With:
```typescript
import { compileMDX } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
```

**Step 2: Update getBlogPost function**

Replace lines 60-65:
```typescript
// Convert markdown to HTML
const processedContent = await remark()
  .use(html)
  .process(content);
const contentHtml = processedContent.toString();
```

With:
```typescript
// Compile MDX with rehype plugins
const { content: mdxContent } = await compileMDX({
  source: content,
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
```

**Step 3: Update return type**

Replace `contentHtml` in return statement:
```typescript
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
```

**Step 4: Update BlogPost interface**

At top of file, replace:
```typescript
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  contentHtml: string;
  // ...
}
```

With:
```typescript
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  mdxContent: React.ReactElement;
  // ...
}
```

**Step 5: Run type check**

Run:
```bash
cd packages/web
npx tsc --noEmit
```

Expected: Type errors in blog/[slug]/page.tsx (will fix next)

**Step 6: Commit**

```bash
git add packages/web/src/lib/blog.ts
git commit -m "refactor: update blog.ts to use next-mdx-remote for MDX compilation"
```

---

### Task 3: Create MDX Components Registry

**Files:**
- Create: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create blog components directory**

Run:
```bash
mkdir -p packages/web/src/components/blog
```

**Step 2: Create mdx-components.tsx skeleton**

Create file with:
```typescript
import type { MDXComponents } from 'mdx/types';

// Placeholder components (will be built in Phase 2)
const Scripture = ({ verse, version = 'NIV', children }: any) => (
  <div className="my-8 p-8 bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 rounded-lg shadow-md">
    <div className="text-sm font-bold uppercase tracking-wide text-amber-800 mb-2">
      {verse} ({version})
    </div>
    <blockquote className="font-serif text-xl italic text-gray-800">
      {children}
    </blockquote>
  </div>
);

const KeyTakeaway = ({ title = 'Key Takeaways', children }: any) => (
  <div className="my-8 p-8 bg-teal-50 border-l-4 border-teal-500 rounded-lg">
    <h3 className="text-lg font-bold text-teal-900 mb-4">{title}</h3>
    <div className="text-gray-800">{children}</div>
  </div>
);

const ApplicationStep = ({ number, title, children }: any) => (
  <div className="my-6 flex gap-4">
    <div className="flex-shrink-0 w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
      {number}
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-700">{children}</p>
    </div>
  </div>
);

const CallToAction = ({
  title,
  description,
  buttonText = 'Get Started',
  buttonLink = '/register'
}: any) => (
  <div className="my-12 bg-gradient-to-r from-teal-600 to-teal-800 rounded-xl shadow-xl p-12 text-center text-white">
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-lg text-teal-50 mb-6">{description}</p>
    <a
      href={buttonLink}
      className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
    >
      {buttonText}
    </a>
  </div>
);

const Warning = ({ severity = 'crisis', children }: any) => {
  const styles = severity === 'crisis'
    ? 'bg-red-50 border-red-400 text-red-900'
    : 'bg-orange-50 border-orange-400 text-orange-900';

  return (
    <div className={`my-8 p-6 border-l-4 rounded-lg ${styles}`} role="alert">
      <div className="font-bold mb-2">
        {severity === 'crisis' ? '⚠️ Crisis Support:' : 'Important:'}
      </div>
      <div>{children}</div>
    </div>
  );
};

const PrayerPrompt = ({ title = 'Prayer Prompt:', children }: any) => (
  <div className="my-8 p-8 bg-purple-50 border-2 border-purple-300 rounded-lg text-center">
    <div className="text-sm font-bold uppercase tracking-wide text-purple-800 mb-4">
      {title}
    </div>
    <p className="font-serif italic text-purple-900">{children}</p>
  </div>
);

// Export component map for MDXRemote
export const mdxComponents: MDXComponents = {
  Scripture,
  KeyTakeaway,
  ApplicationStep,
  CallToAction,
  Warning,
  PrayerPrompt,
  // Enhanced standard HTML elements
  h2: (props: any) => (
    <h2
      className="text-3xl font-bold text-gray-900 mt-12 mb-6 scroll-mt-24"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3
      className="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24"
      {...props}
    />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-teal-600 pl-6 py-2 my-6 bg-teal-50 italic text-gray-800"
      {...props}
    />
  ),
  p: (props: any) => (
    <p className="text-gray-800 leading-relaxed my-6" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc pl-6 my-6 space-y-2 text-gray-800" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal pl-6 my-6 space-y-2 text-gray-800" {...props} />
  ),
  li: (props: any) => (
    <li className="my-2" {...props} />
  ),
};
```

**Step 3: Run type check**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors in mdx-components.tsx

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: create MDX components registry with placeholder components"
```

---

### Task 4: Update Blog Post Page to Use MDX

**Files:**
- Modify: `packages/web/src/app/blog/[slug]/page.tsx:195-199`

**Step 1: Add import**

Add to imports section:
```typescript
import { mdxComponents } from '../../../components/blog/mdx-components';
```

**Step 2: Replace dangerouslySetInnerHTML**

Replace lines 195-199:
```typescript
<div
  className="prose prose-lg max-w-none prose-headings:font-bold..."
  dangerouslySetInnerHTML={{ __html: post.contentHtml }}
/>
```

With:
```typescript
<div className="prose prose-lg max-w-none">
  {post.mdxContent}
</div>
```

Note: The prose styling is now handled by the mdx-components directly

**Step 3: Test locally**

Run:
```bash
npm run dev
```

Navigate to: http://localhost:3699/blog/10-bible-verses-for-anxiety-and-depression

Expected: Blog post renders with basic styling, no errors

**Step 4: Commit**

```bash
git add packages/web/src/app/blog/[slug]/page.tsx
git commit -m "feat: update blog post page to render MDX with custom components"
```

---

### Task 5: Verify MDX Pipeline Works

**Step 1: Build production**

Run:
```bash
cd packages/web
npx nx build web
```

Expected: Build succeeds with no errors

**Step 2: Test one blog post rendering**

Run dev server and check one post fully loads with proper formatting

Expected: All markdown renders correctly (headings, lists, blockquotes, paragraphs)

**Step 3: Commit checkpoint**

```bash
git add -A
git commit -m "chore: verify MDX pipeline working end-to-end"
```

---

## Phase 2: Custom Components (Refined)

### Task 6: Build Scripture Component

**Files:**
- Create: `packages/web/src/components/blog/Scripture.tsx`
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create Scripture component file**

Create `packages/web/src/components/blog/Scripture.tsx`:

```typescript
interface ScriptureProps {
  verse: string;
  version?: string;
  children: React.ReactNode;
}

export default function Scripture({
  verse,
  version = 'NIV',
  children
}: ScriptureProps) {
  return (
    <div className="my-8 md:my-12 p-6 md:p-8 bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-bold uppercase tracking-wide text-amber-800">
          {verse}
        </div>
        <div className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded">
          {version}
        </div>
      </div>
      <blockquote className="font-serif text-lg md:text-xl italic text-gray-800 leading-relaxed">
        {children}
      </blockquote>
    </div>
  );
}
```

**Step 2: Update mdx-components.tsx**

Replace Scripture placeholder import:
```typescript
import Scripture from './Scripture';
```

Remove the placeholder Scripture component definition

**Step 3: Test Scripture component**

Create test blog post snippet in one MDX file:
```mdx
<Scripture verse="Philippians 4:6-7" version="NIV">
Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.
</Scripture>
```

Run dev server and verify rendering

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/Scripture.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: build Scripture component with refined spiritual styling"
```

---

### Task 7: Build KeyTakeaway Component

**Files:**
- Create: `packages/web/src/components/blog/KeyTakeaway.tsx`
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create KeyTakeaway component**

Create `packages/web/src/components/blog/KeyTakeaway.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface KeyTakeawayProps {
  title?: string;
  children: React.ReactNode;
}

export default function KeyTakeaway({
  title = 'Key Takeaways',
  children
}: KeyTakeawayProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-8 md:my-12 bg-teal-50 border-l-4 border-teal-500 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-teal-100 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-teal-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-bold text-teal-900">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-teal-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 text-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update mdx-components.tsx**

Import and replace:
```typescript
import KeyTakeaway from './KeyTakeaway';
```

**Step 3: Test component**

Add to test MDX file:
```mdx
<KeyTakeaway title="Key Points">
- God is close to the brokenhearted
- Prayer brings supernatural peace
- Professional help is biblical wisdom
</KeyTakeaway>
```

Verify collapsing works, animation is smooth

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/KeyTakeaway.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: build collapsible KeyTakeaway component"
```

---

### Task 8: Build ApplicationStep Component

**Files:**
- Create: `packages/web/src/components/blog/ApplicationStep.tsx`
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create ApplicationStep component**

Create `packages/web/src/components/blog/ApplicationStep.tsx`:

```typescript
interface ApplicationStepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

export default function ApplicationStep({
  number,
  title,
  children
}: ApplicationStepProps) {
  return (
    <div className="my-6 flex gap-4 md:gap-6 group hover:scale-[1.01] transition-transform duration-200">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-lg md:text-xl font-bold shadow-lg">
          {number}
        </div>
      </div>
      <div className="flex-1 pt-1">
        <h4 className="font-bold text-gray-900 text-lg mb-2">{title}</h4>
        <div className="text-gray-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
```

**Step 2: Update mdx-components.tsx**

Import and replace:
```typescript
import ApplicationStep from './ApplicationStep';
```

**Step 3: Test component**

Add to MDX:
```mdx
<ApplicationStep number={1} title="Practice Daily Prayer">
Set aside 10 minutes each morning to present your anxieties to God through prayer.
</ApplicationStep>

<ApplicationStep number={2} title="Journal Your Thoughts">
Write down anxious thoughts and counter them with scripture.
</ApplicationStep>
```

Verify numbering, hover effect works

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/ApplicationStep.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: build ApplicationStep component for action items"
```

---

### Task 9: Build CallToAction Component

**Files:**
- Create: `packages/web/src/components/blog/CallToAction.tsx`
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create CallToAction component**

Create `packages/web/src/components/blog/CallToAction.tsx`:

```typescript
import Link from 'next/link';

interface CallToActionProps {
  title: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
  variant?: 'primary' | 'category';
}

export default function CallToAction({
  title,
  description,
  buttonText = 'Get Started',
  buttonLink = '/register',
  variant = 'primary'
}: CallToActionProps) {
  const gradientClass = variant === 'primary'
    ? 'from-teal-600 to-teal-800'
    : 'from-teal-600 to-teal-800'; // Will add category detection later

  return (
    <div className={`my-12 bg-gradient-to-r ${gradientClass} rounded-xl shadow-xl p-8 md:p-12 text-center text-white`}>
      <h3 className="text-2xl md:text-3xl font-bold mb-4">{title}</h3>
      <p className="text-base md:text-lg text-teal-50 mb-6 max-w-2xl mx-auto">
        {description}
      </p>
      <Link
        href={buttonLink}
        className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 hover:-translate-y-0.5 transition-all shadow-lg"
      >
        {buttonText}
      </Link>
    </div>
  );
}
```

**Step 2: Update mdx-components.tsx**

Import and replace:
```typescript
import CallToAction from './CallToAction';
```

**Step 3: Test component**

Add to MDX:
```mdx
<CallToAction
  title="Need Personal Guidance?"
  description="Get confidential, scripture-based counseling tailored to your situation—available 24/7."
  buttonText="Start Free Session"
  buttonLink="/register"
/>
```

Verify button hover effect works

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/CallToAction.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: build CallToAction component for conversions"
```

---

### Task 10: Build Warning Component

**Files:**
- Create: `packages/web/src/components/blog/Warning.tsx`
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create Warning component**

Create `packages/web/src/components/blog/Warning.tsx`:

```typescript
interface WarningProps {
  severity?: 'crisis' | 'caution';
  children: React.ReactNode;
}

export default function Warning({
  severity = 'crisis',
  children
}: WarningProps) {
  const isCrisis = severity === 'crisis';

  const colorClasses = isCrisis
    ? 'bg-red-50 border-red-400 text-red-900'
    : 'bg-orange-50 border-orange-400 text-orange-900';

  const iconColor = isCrisis ? 'text-red-600' : 'text-orange-600';
  const label = isCrisis ? 'Crisis Support:' : 'Important:';

  return (
    <div
      className={`my-8 p-6 border-l-4 rounded-lg ${colorClasses}`}
      role="alert"
      aria-label={`${severity} warning`}
    >
      <div className="flex gap-3">
        <svg
          className={`flex-shrink-0 w-6 h-6 ${iconColor}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <div className="font-bold mb-2">{label}</div>
          <div className="leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Update mdx-components.tsx**

Import and replace:
```typescript
import Warning from './Warning';
```

**Step 3: Test component**

Add to MDX:
```mdx
<Warning>
If you're experiencing suicidal thoughts, call 988 (Suicide & Crisis Lifeline) immediately or go to your nearest emergency room.
</Warning>

<Warning severity="caution">
While biblical counseling is valuable, some conditions require professional medical treatment. Consult with a healthcare provider.
</Warning>
```

Verify both severity levels render correctly

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/Warning.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: build Warning component for crisis and caution alerts"
```

---

### Task 11: Build PrayerPrompt Component

**Files:**
- Create: `packages/web/src/components/blog/PrayerPrompt.tsx`
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Create PrayerPrompt component**

Create `packages/web/src/components/blog/PrayerPrompt.tsx`:

```typescript
interface PrayerPromptProps {
  title?: string;
  children: React.ReactNode;
}

export default function PrayerPrompt({
  title = 'Prayer Prompt:',
  children
}: PrayerPromptProps) {
  return (
    <div className="my-8 md:my-12 p-6 md:p-8 bg-purple-50 border-2 border-purple-300 rounded-lg">
      <div className="flex items-center justify-center gap-3 mb-4">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        <div className="text-sm font-bold uppercase tracking-wide text-purple-800">
          {title}
        </div>
      </div>
      <div className="font-serif italic text-base md:text-lg text-purple-900 text-center leading-relaxed">
        {children}
      </div>
    </div>
  );
}
```

**Step 2: Update mdx-components.tsx**

Import and replace:
```typescript
import PrayerPrompt from './PrayerPrompt';
```

**Step 3: Test component**

Add to MDX:
```mdx
<PrayerPrompt>
Lord, help me to cast all my anxieties on You, knowing You care for me. Give me Your peace that transcends understanding. Amen.
</PrayerPrompt>
```

Verify centered text, icon displays

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/PrayerPrompt.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: build PrayerPrompt component for prayer suggestions"
```

---

## Phase 3: Interactive Features

### Task 12: Build ReadingProgress Component

**Files:**
- Create: `packages/web/src/components/blog/ReadingProgress.tsx`

**Step 1: Create ReadingProgress component**

Create `packages/web/src/components/blog/ReadingProgress.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface ReadingProgressProps {
  category?: string;
}

export default function ReadingProgress({ category = 'Mental Health' }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const article = document.querySelector('article');
      if (!article) return;

      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrolled = window.scrollY - articleTop;
      const total = articleHeight - windowHeight;
      const percentage = Math.min(Math.max((scrolled / total) * 100, 0), 100);

      setProgress(percentage);
    };

    // Throttle with requestAnimationFrame
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    updateProgress(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Category color mapping
  const getGradient = () => {
    switch (category) {
      case 'Mental Health':
        return 'from-teal-500 to-teal-700';
      case 'Relationships':
        return 'from-rose-400 to-rose-600';
      case 'Faith & Spirituality':
        return 'from-amber-400 to-amber-600';
      case 'Parenting':
        return 'from-lime-500 to-lime-700';
      case 'Recovery':
      case 'Addiction':
        return 'from-purple-500 to-purple-700';
      default:
        return 'from-teal-500 to-teal-700';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-1 md:h-0.5 bg-gray-200 z-50">
      <div
        className={`h-full bg-gradient-to-r ${getGradient()} transition-all duration-150 ease-out`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

**Step 2: Test component standalone**

Create test page or add to blog post page temporarily to verify it works

**Step 3: Commit**

```bash
git add packages/web/src/components/blog/ReadingProgress.tsx
git commit -m "feat: build ReadingProgress bar with category theming"
```

---

### Task 13: Build ScrollToTop Component

**Files:**
- Create: `packages/web/src/components/blog/ScrollToTop.tsx`

**Step 1: Create ScrollToTop component**

Create `packages/web/src/components/blog/ScrollToTop.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 w-12 h-12 md:w-14 md:h-14 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 hover:-translate-y-1 transition-all duration-300 z-40 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="Scroll to top"
    >
      <svg
        className="w-6 h-6 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
```

**Step 2: Test component**

Verify it appears after scrolling 500px, disappears when scrolling up

**Step 3: Commit**

```bash
git add packages/web/src/components/blog/ScrollToTop.tsx
git commit -m "feat: build ScrollToTop button with smooth animations"
```

---

### Task 14: Build CopyLinkButton Component

**Files:**
- Create: `packages/web/src/components/blog/CopyLinkButton.tsx`

**Step 1: Create CopyLinkButton component**

Create `packages/web/src/components/blog/CopyLinkButton.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface CopyLinkButtonProps {
  headingId?: string;
}

export default function CopyLinkButton({ headingId }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!headingId) return;

    const url = `${window.location.origin}${window.location.pathname}#${headingId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!headingId) return null;

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Copy link to section"
      title={copied ? 'Copied!' : 'Copy link'}
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-teal-600 hover:text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )}
    </button>
  );
}
```

**Step 2: Update mdx-components to use CopyLinkButton**

Modify `mdx-components.tsx`:

```typescript
import CopyLinkButton from './CopyLinkButton';

// Update h2 and h3 components
h2: ({ id, children, ...props }: any) => (
  <h2
    id={id}
    className="group text-3xl font-bold text-gray-900 mt-12 mb-6 scroll-mt-24 flex items-center"
    {...props}
  >
    {children}
    <CopyLinkButton headingId={id} />
  </h2>
),
h3: ({ id, children, ...props }: any) => (
  <h3
    id={id}
    className="group text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24 flex items-center"
    {...props}
  >
    {children}
    <CopyLinkButton headingId={id} />
  </h3>
),
```

**Step 3: Test copy functionality**

Hover over headings, click link icon, verify URL copied to clipboard

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/CopyLinkButton.tsx packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: add CopyLinkButton to headings for section sharing"
```

---

### Task 15: Build TableOfContents Component

**Files:**
- Create: `packages/web/src/components/blog/TableOfContents.tsx`

**Step 1: Create TableOfContents component**

Create `packages/web/src/components/blog/TableOfContents.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extract headings from article
    const article = document.querySelector('article');
    if (!article) return;

    const elements = article.querySelectorAll('h2, h3');
    const headingData: Heading[] = Array.from(elements).map((elem) => ({
      id: elem.id,
      text: elem.textContent || '',
      level: parseInt(elem.tagName.substring(1)),
    }));

    setHeadings(headingData);

    // Intersection Observer for active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    elements.forEach((elem) => observer.observe(elem));

    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className="hidden xl:block sticky top-24 w-[300px] ml-8">
      <div className="bg-white rounded-lg shadow-lg p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-4 pb-2 border-b">
          Contents
        </h2>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={heading.level === 3 ? 'ml-4' : ''}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={`block py-1 text-sm transition-colors ${
                  activeId === heading.id
                    ? 'text-teal-600 font-bold border-l-3 border-teal-600 pl-3 -ml-3'
                    : 'text-gray-600 hover:text-teal-600 hover:underline'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
```

**Step 2: Test component**

Verify headings are extracted, active section highlights, smooth scroll works

**Step 3: Commit**

```bash
git add packages/web/src/components/blog/TableOfContents.tsx
git commit -m "feat: build TableOfContents with active section tracking"
```

---

### Task 16: Create BlogLayout Wrapper

**Files:**
- Create: `packages/web/src/components/blog/BlogLayout.tsx`
- Modify: `packages/web/src/app/blog/[slug]/page.tsx`

**Step 1: Create BlogLayout component**

Create `packages/web/src/components/blog/BlogLayout.tsx`:

```typescript
import ReadingProgress from './ReadingProgress';
import ScrollToTop from './ScrollToTop';
import TableOfContents from './TableOfContents';

interface BlogLayoutProps {
  children: React.ReactNode;
  category: string;
}

export default function BlogLayout({ children, category }: BlogLayoutProps) {
  return (
    <>
      <ReadingProgress category={category} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 max-w-[720px]">
            {children}
          </div>

          {/* TOC sidebar (desktop only) */}
          <TableOfContents />
        </div>
      </div>

      <ScrollToTop />
    </>
  );
}
```

**Step 2: Update blog post page to use BlogLayout**

Modify `packages/web/src/app/blog/[slug]/page.tsx`:

Import:
```typescript
import BlogLayout from '../../../components/blog/BlogLayout';
```

Wrap article content around line 135-256 with BlogLayout:
```typescript
<BlogLayout category={post.category}>
  <article>
    {/* Category Badge */}
    {/* ... existing article content ... */}
  </article>
</BlogLayout>
```

**Step 3: Test full layout**

Verify TOC appears on right sidebar (>1280px), progress bar at top, scroll-to-top button works

**Step 4: Commit**

```bash
git add packages/web/src/components/blog/BlogLayout.tsx packages/web/src/app/blog/[slug]/page.tsx
git commit -m "feat: create BlogLayout wrapper with TOC, progress bar, scroll-to-top"
```

---

## Phase 4: Visual Enhancements

### Task 17: Add Category Theming Utility

**Files:**
- Create: `packages/web/src/lib/category-theme.ts`

**Step 1: Create category theming utility**

Create `packages/web/src/lib/category-theme.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/web/src/lib/category-theme.ts
git commit -m "feat: add category theming utility for consistent color scheme"
```

---

### Task 18: Add Hero Image Support

**Files:**
- Modify: `packages/web/src/app/blog/[slug]/page.tsx`

**Step 1: Update article header with hero image support**

Replace article header section (around lines 135-163) with:

```typescript
{/* Hero Image or Gradient Header */}
{post.image ? (
  <div className="relative w-full h-64 md:h-96 -mx-4 sm:-mx-6 lg:-mx-8 mb-8">
    <Image
      src={post.image}
      alt={post.imageAlt || post.title}
      fill
      className="object-cover"
      priority
    />
    <div className={`absolute inset-0 bg-gradient-to-t ${getCategoryTheme(post.category).gradient} opacity-60`} />
    <div className="absolute inset-0 flex flex-col justify-end p-8">
      <span className={`inline-block px-4 py-2 ${getCategoryTheme(post.category).badgeBg} ${getCategoryTheme(post.category).badgeText} text-sm font-semibold rounded-full mb-4 w-fit`}>
        {post.category}
      </span>
      <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
        {post.title}
      </h1>
    </div>
  </div>
) : (
  <>
    <div className={`w-full h-24 bg-gradient-to-r ${getCategoryTheme(post.category).gradient} -mx-4 sm:-mx-6 lg:-mx-8 mb-8`} />

    <div className="mb-4">
      <span className={`inline-block px-4 py-2 ${getCategoryTheme(post.category).badgeBg} ${getCategoryTheme(post.category).badgeText} text-sm font-semibold rounded-full`}>
        {post.category}
      </span>
    </div>

    <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6">
      {post.title}
    </h1>
  </>
)}
```

**Step 2: Import category theme utility**

Add import:
```typescript
import { getCategoryTheme } from '../../../lib/category-theme';
```

**Step 3: Test both hero image and fallback**

Verify gradient fallback works for posts without images

**Step 4: Commit**

```bash
git add packages/web/src/app/blog/[slug]/page.tsx
git commit -m "feat: add hero image support with category gradient fallback"
```

---

### Task 19: Enhance Typography

**Files:**
- Modify: `packages/web/src/components/blog/mdx-components.tsx`

**Step 1: Refine typography classes**

Update standard element styles:

```typescript
p: (props: any) => (
  <p className="text-base md:text-lg text-gray-800 leading-relaxed my-6" {...props} />
),
ul: (props: any) => (
  <ul className="list-disc pl-6 my-6 space-y-3 text-base md:text-lg text-gray-800" {...props} />
),
ol: (props: any) => (
  <ol className="list-decimal pl-6 my-6 space-y-3 text-base md:text-lg text-gray-800" {...props} />
),
li: (props: any) => (
  <li className="my-2 leading-relaxed" {...props} />
),
strong: (props: any) => (
  <strong className="font-bold text-gray-900" {...props} />
),
em: (props: any) => (
  <em className="italic" {...props} />
),
```

**Step 2: Test typography rendering**

Verify responsive sizing, comfortable line height

**Step 3: Commit**

```bash
git add packages/web/src/components/blog/mdx-components.tsx
git commit -m "feat: enhance typography with responsive sizing and improved spacing"
```

---

### Task 20: Update One Sample Blog Post

**Files:**
- Modify: `packages/web/content/blog/10-bible-verses-for-anxiety-and-depression.mdx`

**Step 1: Add custom components to sample post**

Edit the MDX file to include examples of all components:

After the introduction, add:
```mdx
<KeyTakeaway title="What You'll Learn">
- 10 powerful scripture passages for anxiety and depression
- How to apply biblical truth to mental health struggles
- Practical steps for finding peace through God's Word
- When to seek professional help alongside spiritual support
</KeyTakeaway>
```

Replace first scripture quote with:
```mdx
<Scripture verse="Philippians 4:6-7" version="NIV">
Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.
</Scripture>
```

Add ApplicationSteps near the end:
```mdx
## Applying These Verses Daily

<ApplicationStep number={1} title="Morning Scripture Meditation">
Choose one verse each morning. Write it on a card and carry it with you throughout the day.
</ApplicationStep>

<ApplicationStep number={2} title="Prayer Journaling">
When anxiety strikes, write out your worries and pair each with a relevant scripture verse.
</ApplicationStep>

<ApplicationStep number={3} title="Memorization Practice">
Commit one verse per week to memory. Repetition helps God's truth take root in your heart.
</ApplicationStep>
```

Add Warning near professional help section:
```mdx
<Warning>
If you're experiencing suicidal thoughts, severe depression, or panic attacks, call 988 (Suicide & Crisis Lifeline) immediately. Scripture is powerful, but God also works through medical professionals and therapists.
</Warning>
```

Add PrayerPrompt:
```mdx
<PrayerPrompt>
Heavenly Father, I bring my anxious thoughts to You right now. Help me to trust in Your promises and experience Your peace that surpasses understanding. Give me strength for today and hope for tomorrow. In Jesus' name, Amen.
</PrayerPrompt>
```

Add CallToAction before conclusion:
```mdx
<CallToAction
  title="Need Someone to Talk To?"
  description="Our AI-powered biblical counselors are available 24/7 to provide scripture-based guidance for your specific situation."
  buttonText="Start Free Conversation"
  buttonLink="/register"
/>
```

**Step 2: Test full blog post**

Run dev server, navigate to post, verify all components render beautifully

**Step 3: Commit**

```bash
git add packages/web/content/blog/10-bible-verses-for-anxiety-and-depression.mdx
git commit -m "feat: enhance sample blog post with all custom MDX components"
```

---

## Phase 5: Testing & Polish

### Task 21: Mobile Testing

**Step 1: Test mobile layout**

Run dev server and test on:
- Chrome DevTools mobile emulation (iPhone 14, Pixel 7)
- Actual mobile device if available

Verify:
- TOC hidden on mobile
- Component padding reduced appropriately
- Touch targets at least 44x44px
- Text readable (minimum 16px)
- No horizontal scroll

**Step 2: Fix any mobile issues**

Document and fix any layout problems found

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve mobile layout issues"
```

---

### Task 22: Build Production & Performance Test

**Step 1: Clear cache and build**

Run:
```bash
npx nx reset
cd packages/web
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online \
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016 \
npx nx build web --skip-nx-cache
```

Expected: Build succeeds with no errors

**Step 2: Run Lighthouse audit**

Run production build locally:
```bash
npm run start
```

Run Lighthouse on a blog post page

Target scores:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

**Step 3: Document results**

Note any areas for improvement

**Step 4: Commit checkpoint**

```bash
git add -A
git commit -m "test: verify production build and Lighthouse scores"
```

---

### Task 23: Accessibility Audit

**Step 1: Check keyboard navigation**

Test:
- Tab through all interactive elements
- Focus visible on all focusable elements
- Enter/Space activates buttons
- Escape closes any modals/drawers

**Step 2: Check screen reader compatibility**

Use browser screen reader (NVDA, VoiceOver) to test:
- Headings announced correctly
- Landmarks identified
- Alt text on images
- ARIA labels on buttons

**Step 3: Check color contrast**

Verify all text meets WCAG AA standards (4.5:1 for normal text)

**Step 4: Fix accessibility issues**

Make necessary improvements

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "a11y: improve keyboard navigation and screen reader support"
```

---

### Task 24: Final Documentation

**Files:**
- Create: `docs/operations/blog-component-guide.md`

**Step 1: Create component usage guide**

Document all 6 components with:
- Purpose
- Props
- Usage examples
- When to use
- Mobile considerations

**Step 2: Commit documentation**

```bash
git add docs/operations/blog-component-guide.md
git commit -m "docs: add blog component usage guide for authors"
```

---

### Task 25: Final Commit & Summary

**Step 1: Verify all tests pass**

Run:
```bash
npm run build
```

Verify no errors

**Step 2: Create summary commit**

```bash
git add -A
git commit -m "feat: complete blog formatting system implementation

Implemented comprehensive blog formatting system:
- Replaced remark-html with next-mdx-remote for React components
- Built 6 custom MDX components (Scripture, KeyTakeaway, ApplicationStep, CallToAction, Warning, PrayerPrompt)
- Added 4 interactive features (TOC, reading progress, copy links, scroll-to-top)
- Implemented category theming with gradient system
- Enhanced typography with responsive sizing
- Added hero image support with gradient fallbacks
- Optimized for mobile with touch-friendly interactions
- Achieved Lighthouse scores >90 across all metrics
- Full WCAG AA accessibility compliance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria Checklist

- [ ] All 6 custom components render correctly in MDX
- [ ] Table of Contents auto-generates and tracks active section
- [ ] Reading progress bar updates smoothly on scroll
- [ ] Copy link buttons work on all headings
- [ ] Scroll-to-top appears after 500px scroll
- [ ] Category theming applied consistently
- [ ] Hero images display with gradient overlays
- [ ] Fallback gradients work for posts without images
- [ ] Mobile layout adapts properly (<768px)
- [ ] Typography is readable on all screen sizes
- [ ] Lighthouse scores >90 (performance, accessibility, best practices, SEO)
- [ ] Keyboard navigation works throughout
- [ ] Screen reader compatibility verified
- [ ] Production build succeeds
- [ ] Component documentation complete

---

## Notes

- Use `'use client'` directive for interactive components (KeyTakeaway, ReadingProgress, TableOfContents, ScrollToTop, CopyLinkButton)
- Server components by default for static content (Scripture, ApplicationStep, CallToAction, Warning, PrayerPrompt)
- Category theming uses Tailwind's gradient utilities
- Mobile-first CSS approach throughout
- Accessibility is non-negotiable - meet WCAG AA standards
