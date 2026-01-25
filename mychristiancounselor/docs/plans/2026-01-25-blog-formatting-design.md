# Blog Formatting System Design

**Date:** 2026-01-25
**Status:** Approved
**Type:** Enhancement

## Overview

Comprehensive blog formatting system that transforms the MyChristianCounselor blog from basic MDX rendering into a rich, interactive reading experience with custom components, enhanced typography, and mobile optimization.

## Goals

1. Create purpose-built MDX components for biblical content
2. Enhance visual design with refined spiritual aesthetic
3. Add essential interactive features (TOC, progress bar, copy links)
4. Optimize reading experience across all devices
5. Maintain simple authoring workflow for content creators

## Architecture & Technology Stack

### MDX Processing Pipeline

**Current State:**
- MDX files with frontmatter → gray-matter → remark → remark-html → dangerouslySetInnerHTML

**New State:**
- MDX files with frontmatter → gray-matter → next-mdx-remote/serialize → MDXRemote with custom components

### Technology Changes

**Add Dependencies:**
- `next-mdx-remote` (v5+) - Server-side MDX compilation with React components
- `rehype-slug` - Auto-generate heading IDs
- `rehype-autolink-headings` - Auto-link headings for anchor navigation

**Keep Existing:**
- `gray-matter` - Frontmatter parsing
- `@tailwindcss/typography` - Base prose styling

### File Structure

```
packages/web/
├── src/
│   ├── components/blog/
│   │   ├── mdx-components.tsx        # Component registry
│   │   ├── Scripture.tsx              # Bible verse blocks
│   │   ├── KeyTakeaway.tsx            # Collapsible summaries
│   │   ├── ApplicationStep.tsx        # Action items
│   │   ├── CallToAction.tsx           # Conversion boxes
│   │   ├── Warning.tsx                # Crisis/professional help alerts
│   │   ├── PrayerPrompt.tsx           # Prayer suggestions
│   │   ├── TableOfContents.tsx        # Sticky TOC
│   │   ├── ReadingProgress.tsx        # Top progress bar
│   │   ├── ScrollToTop.tsx            # Bottom-right button
│   │   ├── BlogLayout.tsx             # Wrapper with TOC + progress
│   │   └── CopyLinkButton.tsx         # Heading anchor links
│   └── lib/blog.ts                    # Updated for MDX serialization
└── content/blog/*.mdx                 # No changes to existing files
```

### Component Provider Pattern

Create centralized `mdx-components.tsx` that exports all custom components:

```tsx
import { MDXComponents } from 'mdx/types';
import Scripture from './Scripture';
import KeyTakeaway from './KeyTakeaway';
// ... other components

export const mdxComponents: MDXComponents = {
  Scripture,
  KeyTakeaway,
  ApplicationStep,
  CallToAction,
  Warning,
  PrayerPrompt,
  // Standard HTML elements with enhanced styling
  h2: (props) => <h2 className="..." {...props}><CopyLinkButton />{props.children}</h2>,
  h3: (props) => <h3 className="..." {...props}><CopyLinkButton />{props.children}</h3>,
  blockquote: (props) => <blockquote className="..." {...props} />,
};
```

Pass to `MDXRemote` in blog post page.

## Visual Design System

### Color Palette - Refined Spiritual

**Base Colors:**
- Primary Teal: `#0d9488` (teal-600) - brand color
- Warm Gold: `#f59e0b` (amber-500) - scripture accents
- Soft Rose: `#fb7185` (rose-400) - relationships
- Sage Green: `#84cc16` (lime-500) - parenting
- Soft Purple: `#a855f7` (purple-500) - recovery/addiction

**Category Theming:**

Each category gets a signature gradient for hero images, badges, and accents:

| Category | Primary Color | Gradient |
|----------|--------------|----------|
| Mental Health | Teal | `from-teal-500 to-teal-700` |
| Relationships | Rose | `from-rose-400 to-rose-600` |
| Faith & Spirituality | Gold | `from-amber-400 to-amber-600` |
| Parenting | Sage | `from-lime-500 to-lime-700` |
| Recovery/Addiction | Purple | `from-purple-500 to-purple-700` |

### Typography System

**Body & UI (Sans-serif):**
- Font: Inter/system font stack (existing)
- Article body: `prose-lg` (18px base)
- Line height: 1.8 for comfortable reading
- Paragraph spacing: 1.5rem (24px)

**Scripture & Quotes (Serif):**
- Font family: `font-serif` (Georgia fallback)
- Scripture blocks: 20px, italic
- Emphasis through size and style, not just color

**Responsive Scaling:**

| Breakpoint | Title | Body | Scripture |
|------------|-------|------|-----------|
| Mobile (<768px) | 2xl (28px) | base (16px) | 18px |
| Tablet (768-1024px) | 3xl (32px) | lg (18px) | 20px |
| Desktop (>1024px) | 4xl (36px) | lg (18px) | 20px |

### Spacing & Rhythm

- Section spacing: 3rem (48px) desktop, 2rem mobile
- Component spacing: 2rem (32px) before/after custom components
- Card/box padding: 2rem (32px) desktop, 1.5rem mobile
- Content max-width: 720px (65-75 characters per line)
- Layout max-width: 1280px (content + TOC sidebar)

### Visual Elements

- Border radius: `rounded-lg` (8px) for cards, `rounded-xl` (12px) for hero
- Shadows: `shadow-lg` on cards, `shadow-xl` on elevated elements
- Borders: 4px left borders for emphasis (Scripture, KeyTakeaway)
- Gradients: 45deg angle, subtle (opacity 60% on hero overlays)

## Custom MDX Components

### 1. Scripture Component

**Purpose:** Display Bible verses with proper attribution and reverent styling.

**Usage:**
```mdx
<Scripture verse="Philippians 4:6-7" version="NIV">
Do not be anxious about anything, but in every situation, by prayer and petition,
with thanksgiving, present your requests to God.
</Scripture>
```

**Props:**
- `verse` (required): Biblical reference (e.g., "Philippians 4:6-7")
- `version` (optional): Bible translation (NIV, ESV, KJV), default "NIV"
- `children`: Verse text content

**Visual Design:**
- Serif font (Georgia), 20px, italic
- Gradient background: `from-amber-50 to-amber-100`
- Golden left border: 4px, `border-amber-500`
- Verse reference: small caps, bold, above text
- Bible version badge: top-right corner, small, subtle
- Padding: 2rem
- Shadow: subtle `shadow-md`
- Rounded corners: `rounded-lg`

**Mobile Adjustments:**
- Font size: 18px
- Padding: 1.5rem
- Version badge below reference instead of corner

### 2. KeyTakeaway Component

**Purpose:** Collapsible summary boxes for key points and main lessons.

**Usage:**
```mdx
<KeyTakeaway title="Key Points">
- God is close to the brokenhearted (Psalm 34:18)
- Prayer brings supernatural peace (Philippians 4:6-7)
- Professional help is biblical wisdom (Proverbs 11:14)
</KeyTakeaway>
```

**Props:**
- `title` (optional): Header text, default "Key Takeaways"
- `children`: Content (supports markdown lists)

**Visual Design:**
- Collapsible section (starts expanded by default)
- Icon: Light bulb or bookmark icon (left of title)
- Background: `bg-teal-50`, `border-l-4 border-teal-500`
- Title: bold, `text-teal-900`, 18px
- Chevron icon: rotates 180deg when collapsed
- Content: markdown rendered (lists, bold, etc.)
- Animation: smooth height transition (300ms ease-in-out)
- Padding: 2rem
- Rounded corners: `rounded-lg`

**Behavior:**
- Click header to toggle
- State persists during session (optional: localStorage)
- No layout shift on collapse

### 3. ApplicationStep Component

**Purpose:** Numbered action items that readers can apply.

**Usage:**
```mdx
<ApplicationStep number={1} title="Practice Daily Prayer">
Set aside 10 minutes each morning to present your anxieties to God through prayer.
</ApplicationStep>
```

**Props:**
- `number` (required): Step number (1, 2, 3...)
- `title` (required): Short action title
- `children`: Detailed explanation

**Visual Design:**
- Large circular number badge: 48px diameter, teal background, white text
- Title: bold, adjacent to number, `text-gray-900`
- Content: indented with subtle connecting line from badge
- Optional checkbox icon: indicates actionability
- Hover: slight scale (1.02) and shadow increase
- Spacing: 1.5rem between steps

**Mobile Adjustments:**
- Badge: 40px diameter
- Stack badge above title on very small screens

### 4. CallToAction Component

**Purpose:** Conversion boxes prompting readers to take action (register, start session).

**Usage:**
```mdx
<CallToAction
  title="Need Personal Guidance?"
  description="Get confidential, scripture-based counseling tailored to your situation—available 24/7."
  buttonText="Start Free Session"
  buttonLink="/register"
/>
```

**Props:**
- `title` (required): Headline
- `description` (required): Supporting text
- `buttonText` (optional): Button label, default "Get Started"
- `buttonLink` (optional): Button URL, default "/register"
- `variant` (optional): Color scheme ("primary" = teal, "category" = use article category color)

**Visual Design:**
- Centered content layout
- Gradient background: category-based or default teal (`from-teal-600 to-teal-800`)
- White text on colored background
- Title: 2xl, bold
- Description: lg, `text-teal-50` (slightly muted)
- Button: Large, white background, colored text (inverse), rounded-lg
- Button hover: lift effect (translateY -2px) + shadow
- Padding: 3rem desktop, 2rem mobile
- Shadow: `shadow-xl` for prominence
- Rounded: `rounded-xl`

### 5. Warning Component

**Purpose:** Alert readers to crisis situations or when professional help is needed.

**Usage:**
```mdx
<Warning>
If you're experiencing suicidal thoughts, call 988 (Suicide & Crisis Lifeline)
immediately or go to your nearest emergency room.
</Warning>
```

**Props:**
- `children`: Warning message content
- `severity` (optional): "crisis" (red), "caution" (orange), default "crisis"

**Visual Design:**
- Alert color scheme:
  - Crisis: `bg-red-50`, `border-red-400`, `text-red-900`
  - Caution: `bg-orange-50`, `border-orange-400`, `text-orange-900`
- Alert triangle icon: left side, matching border color
- Bold "Crisis Support:" or "Important:" prefix
- Left border: 4px, colored
- Links: bold, underlined, matching border color
- Padding: 1.5rem
- Rounded: `rounded-lg`

**Accessibility:**
- `role="alert"`
- `aria-label` describing severity
- High contrast ratios

### 6. PrayerPrompt Component

**Purpose:** Styled prayer suggestions for readers.

**Usage:**
```mdx
<PrayerPrompt>
Lord, help me to cast all my anxieties on You, knowing You care for me.
Give me Your peace that transcends understanding. Amen.
</PrayerPrompt>
```

**Props:**
- `children`: Prayer text
- `title` (optional): Label above prayer, default "Prayer Prompt:"

**Visual Design:**
- Soft background: `bg-purple-50`, `border-purple-300`
- Prayer hands icon or dove icon (top-left or centered)
- Label: "Prayer Prompt:" in small caps, `text-purple-800`
- Text: italic, 16px, `text-purple-900`
- Border: 2px all around (not just left)
- Padding: 2rem
- Centered text alignment for shorter prayers
- Rounded: `rounded-lg`

## Interactive Features

### 1. Table of Contents (Sticky Sidebar)

**Purpose:** Help readers navigate long articles and understand structure at a glance.

**Behavior:**
- Auto-generated from H2 and H3 headings in article
- Sticky positioning on desktop (appears at ~200px scroll, stays in view)
- Hidden on mobile (<1024px), optional collapsible drawer
- Active section highlighted based on scroll position (Intersection Observer)
- Smooth scroll to section on click
- Updates URL hash on click

**Visual Design:**
- Position: right sidebar on wide screens (>1280px), 300px width
- Background: `bg-white`, `shadow-lg`, `rounded-lg`
- Heading: "Contents" in small caps, `text-gray-700`, border-bottom
- Links: `text-gray-600`, hover → `text-teal-600` with underline
- Active link: bold, `text-teal-600`, left border accent (3px)
- Nested indentation: H3s indented 1rem from H2s
- Padding: 1.5rem
- Max height: 80vh with scroll if needed

**Implementation:**
- Component extracts headings from MDX content
- Uses Intersection Observer to track visible sections
- Sticky position with top offset for header clearance

### 2. Reading Progress Bar

**Purpose:** Visual indicator of article reading progress.

**Behavior:**
- Fixed at top of viewport (below nav if present)
- Calculates: (scrolled within article / total article height) × 100%
- Updates on scroll using requestAnimationFrame
- Only tracks article content area, not full page

**Visual Design:**
- Height: 3px desktop, 4px mobile
- Gradient: matches article category color
- Full width, z-index above content but below modals
- Smooth width transition
- Optional: subtle glow effect at leading edge

**Implementation:**
- Scroll event listener with RAF throttling
- Refs to article container for bounds calculation
- CSS transform for performance (not width animation)

### 3. Copy Link on Headings

**Purpose:** Allow readers to share specific sections of articles.

**Behavior:**
- Anchor icon appears on H2/H3 hover (desktop)
- Always visible on mobile (touch devices)
- Click copies full URL with hash anchor to clipboard
- Brief "Copied!" tooltip/toast confirmation
- Auto-generated IDs on headings (via rehype-slug)

**Visual Design:**
- Small link/chain icon, 18px, `text-teal-600`
- Positioned to left of heading (margin-left: -28px on desktop)
- Opacity transition: 0 → 1 on heading hover
- Icon hover: darker teal, cursor pointer
- Tooltip: small, `bg-gray-900`, `text-white`, appears above icon briefly

**Implementation:**
- Custom heading components in mdx-components.tsx
- Navigator.clipboard.writeText() API
- Fallback for older browsers

### 4. Scroll-to-Top Button

**Purpose:** Quick navigation back to article start on long posts.

**Behavior:**
- Appears after scrolling >500px down
- Fades in/out with scroll position
- Smooth scroll back to top on click
- Hidden when near top of page

**Visual Design:**
- Position: fixed bottom-right, 24px from edges
- Shape: circular, 48px diameter desktop, 56px mobile
- Background: `bg-teal-600`, white up-arrow icon
- Shadow: `shadow-lg` for elevation
- Hover: lift effect (translateY -2px) + `bg-teal-700`
- Z-index: above content, below modals

**Accessibility:**
- `aria-label="Scroll to top"`
- Keyboard accessible (Enter/Space)
- Focus visible styles

### 5. Collapsible Sections (KeyTakeaway)

**Purpose:** Allow readers to expand/collapse summary content.

**Behavior:**
- Click header to toggle open/closed
- Default state: expanded on page load
- Optional: persist state in sessionStorage
- Keyboard accessible (Enter/Space on header)

**Visual Design:**
- Chevron icon in header: rotates 180deg when collapsed
- Header: cursor pointer, hover background change
- Content: smooth height animation (max-height technique)
- Animation: 300ms ease-in-out
- No jarring layout shifts (reserve space for icon)

**Implementation:**
- React state for open/closed
- CSS transitions on max-height
- Optional: sessionStorage key based on article slug + component index

## Content Structure & Layout

### Enhanced Article Header

**With Hero Image (optional):**
- Full-width hero section (100vw)
- Image: `object-cover`, centered
- Gradient overlay: 60% opacity, category color, bottom-to-top
- Title overlaid on image: white text, 3xl-4xl, bold, centered
- Category badge: top-left corner on overlay
- Author/date/read-time: below image in content area
- Height: 400px desktop, 250px mobile

**Without Hero Image (fallback):**
- Category-colored gradient background bar (100px height)
- Title in content area below gradient: colored text, not white
- Same meta info layout
- Maintains visual hierarchy

**Frontmatter Addition:**
```yaml
---
title: "..."
image: "/images/blog/hero-image.jpg"  # Optional
imageAlt: "Calming nature scene"       # Optional
---
```

**Article Metadata Bar:**
- Layout: single row desktop, stacked mobile
- Author name + small avatar circle (optional, use placeholder)
- Published date: "January 18, 2026" format
- Read time: "6 min read"
- Last updated: "(Updated Jan 20)" if updatedDate present
- Share buttons: Twitter, Facebook, LinkedIn icons
- Dividers: subtle `|` between elements

### Enhanced Article Footer

**1. Scripture References Section (new):**
- Heading: "Scriptures Referenced in This Article"
- Auto-extracted list from all Scripture components
- Format: "Philippians 4:6-7 (NIV)" as clickable links
- Click scrolls to that Scripture block in article
- Card background: `bg-gray-50`, rounded, padding 1.5rem
- Hidden if no Scripture components used

**2. Tags Section (enhanced):**
- Keep existing tag display
- Make tags clickable: link to `/blog?tag=anxiety`
- Visual: pill-shaped, category color accent on hover
- Add "Topics:" label

**3. Author Bio Card (new):**
- Small card below tags
- Heading: "Written by [Author Name]"
- Bio text: "Our team of biblical counselors and mental health professionals..."
- Optional: small team photo or icon
- Link: "Learn more about our team" → /about
- Background: `bg-white`, border, rounded

**4. Related Posts (enhanced):**
- Smarter selection algorithm:
  1. Same category, exclude current post
  2. If <3 results, add posts with shared tags
  3. If still <3, add most recent posts
- Layout: 2 columns tablet, 3 columns desktop, carousel mobile
- Enhanced cards: gradient top border (category color), better images
- Show 3 posts on desktop, 2 on tablet, horizontal scroll mobile

### Content Width & Reading Experience

- Article content: `max-w-[720px]` (65-75 characters per line)
- Full layout: `max-w-7xl` (1280px) for content + TOC sidebar
- TOC sidebar: 300px width, 2rem gap from content
- Centered layout with auto margins
- Images within content: max-width 100%, rounded corners, shadow, caption support

## Mobile Optimization

### Responsive Typography

**Scaling Strategy:**

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Article Title | 2xl (28px) | 3xl (32px) | 4xl (36px) |
| Body Text | base (16px) | lg (18px) | lg (18px) |
| H2 Headings | 2xl (24px) | 3xl (30px) | 3xl (30px) |
| H3 Headings | xl (20px) | 2xl (24px) | 2xl (24px) |
| Scripture | 18px | 20px | 20px |
| Line Height | 1.75 | 1.8 | 1.8 |

**Font Size Constraints:**
- Never below 16px (prevents iOS auto-zoom)
- Maintain readability at all sizes
- Preserve hierarchy through size + weight + spacing

### Mobile Layout Adaptations

**Table of Contents:**
- Option A (simpler): Hide entirely on mobile
- Option B: Collapsible drawer at top of article
  - "Table of Contents" button below title
  - Drawer slides from top with backdrop
  - Click backdrop or X to close

**Hero Images:**
- Height: 250px mobile (vs 400px desktop)
- Title placement: below image instead of overlay (better contrast)
- Gradient bar: simplified to solid color with less height

**Component Spacing:**
- Reduce padding: 1.5rem (vs 2rem desktop)
- Section spacing: 2rem (vs 3rem desktop)
- Maintain readability while fitting more content per screen

**Interactive Elements:**
- Copy link buttons: always visible (no hover state on touch)
- Touch targets: minimum 44×44px (Apple guidelines)
- Scroll-to-top: 56px diameter (vs 48px desktop)
- Progress bar: 4px height (vs 3px desktop) for visibility

### Mobile Navigation

**Sticky Header Behavior:**
- Compact nav bar: hides on scroll down, shows on scroll up
- Mobile: only logo + hamburger menu
- Reading progress bar directly below header
- Smooth hide/show animation

**Reading Optimizations:**
- Disable double-tap zoom (user-scalable=no with 16px minimum)
- Proper viewport meta tag
- Touch-friendly link spacing (minimum 8px padding)
- Disable text selection on UI elements (not article content)

### Performance Considerations

**Images:**
- Next.js Image component with automatic optimization
- Blur placeholder for hero images (dataUrl)
- Lazy loading for below-fold images
- Responsive sizes: srcSet for 320px, 768px, 1280px

**JavaScript:**
- Lazy load interactive components below fold
- Code splitting: TOC, progress bar as separate chunks
- Minimize client-side JS (leverage RSC)

**CSS:**
- Mobile-first approach (desktop as enhancement)
- Critical CSS inlined
- Minimize layout shift (CLS score <0.1)

**Fonts:**
- Preload Inter font (font-display: swap)
- System font fallback (instant render)

## Implementation Phases

### Phase 1: MDX Infrastructure
1. Install dependencies (next-mdx-remote, rehype plugins)
2. Update blog.ts to serialize MDX instead of HTML
3. Update blog post page to use MDXRemote
4. Create mdx-components.tsx registry
5. Test with existing posts (should render identically at first)

### Phase 2: Custom Components
1. Build Scripture component
2. Build KeyTakeaway component
3. Build ApplicationStep component
4. Build CallToAction component
5. Build Warning component
6. Build PrayerPrompt component
7. Document component usage for authors

### Phase 3: Interactive Features
1. Build ReadingProgress component
2. Build TableOfContents component
3. Add copy link buttons to headings
4. Build ScrollToTop component
5. Integrate all into BlogLayout wrapper

### Phase 4: Visual Enhancements
1. Implement category theming
2. Add hero image support with fallbacks
3. Enhanced article header/footer layouts
4. Typography refinements
5. Mobile responsive adjustments

### Phase 5: Polish & Testing
1. Test all components in actual blog posts
2. Mobile testing (iOS Safari, Android Chrome)
3. Performance optimization (Lighthouse scores)
4. Accessibility audit (WCAG AA compliance)
5. Update one sample blog post with all components

## Success Criteria

1. **Functionality:** All 6 custom components render correctly in MDX
2. **Interactivity:** TOC, progress bar, copy links all work smoothly
3. **Visual Quality:** Refined spiritual aesthetic matches brand
4. **Mobile Experience:** Readable and functional on all screen sizes
5. **Performance:** Lighthouse scores >90 (performance, accessibility, best practices)
6. **Authoring:** Content team can easily use components in MDX

## Future Enhancements (Out of Scope)

- Inline annotations/tooltips for biblical terms
- Reading position persistence (resume where left off)
- Print-optimized stylesheet
- Dark mode support
- Audio playback of articles (text-to-speech)
- Comment system integration
- Social share preview image generation
- Advanced analytics (reading depth, component engagement)

## Related Documents

- `/packages/web/src/lib/blog.ts` - Blog utility functions
- `/packages/web/src/app/blog/[slug]/page.tsx` - Blog post page
- `/packages/web/content/blog/*.mdx` - Blog post content files
- `/docs/operations/content-authoring-guide.md` - (Future) Component usage guide

---

**Design Approved:** 2026-01-25
**Next Steps:** Create implementation plan with git worktree for isolated development
