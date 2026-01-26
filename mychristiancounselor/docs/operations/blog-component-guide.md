# Blog Component Usage Guide

**Audience:** Content authors creating blog posts in MDX format
**Last Updated:** 2026-01-25

This guide explains how to use the 6 custom components available in your MDX blog posts to create engaging, visually appealing, and mobile-friendly content.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Frontmatter Requirements](#frontmatter-requirements)
3. [Component Reference](#component-reference)
   - [Scripture](#scripture)
   - [KeyTakeaway](#keytakeaway)
   - [ApplicationStep](#applicationstep)
   - [CallToAction](#calltoaction)
   - [Warning](#warning)
   - [PrayerPrompt](#prayerprompt)
4. [Best Practices](#best-practices)
5. [Mobile Considerations](#mobile-considerations)

---

## Getting Started

MDX is an extension of Markdown that lets you use React components directly in your content. All blog posts in `/packages/web/content/blog/` should use the `.mdx` extension.

**Basic Structure:**
```mdx
---
[frontmatter goes here]
---

# Your Blog Post Title

Your introduction paragraph...

<ComponentName prop="value">
  Content goes here
</ComponentName>

More content...
```

**Important:** Component names are case-sensitive. Always use the exact capitalization shown in this guide.

---

## Frontmatter Requirements

Every blog post must include frontmatter at the top of the file. Frontmatter is metadata about your post, enclosed between triple dashes (`---`).

### Required Fields

```yaml
---
title: "Your Blog Post Title"
slug: "your-blog-post-slug"
excerpt: "A brief 1-2 sentence description that appears in search results and post previews."
category: "Mental Health"
tags: ["tag1", "tag2", "tag3"]
publishedDate: "2026-01-25"
readTime: "6 min read"
---
```

### Field Descriptions

- **title**: The full title of your blog post (will appear as H1)
- **slug**: URL-friendly version of the title (lowercase, hyphens instead of spaces)
- **excerpt**: Brief description for SEO and previews (aim for 120-160 characters)
- **category**: Choose from: "Mental Health", "Marriage & Family", "Spiritual Growth", "Recovery & Addiction", "Grief & Loss"
- **tags**: Array of relevant keywords for searchability
- **publishedDate**: Publication date in YYYY-MM-DD format
- **readTime**: Estimated reading time (calculate ~200 words per minute)

### Example

```yaml
---
title: "10 Powerful Bible Verses for Anxiety and Depression"
slug: "10-bible-verses-for-anxiety-and-depression"
excerpt: "Find comfort and hope in these scripture passages that address anxiety, depression, and mental health struggles from a Christian perspective."
category: "Mental Health"
tags: ["anxiety", "depression", "scripture", "mental health", "hope"]
publishedDate: "2026-01-18"
readTime: "6 min read"
---
```

---

## Component Reference

### Scripture

**Purpose:** Display Bible verses in a visually distinctive, highlighted format.

**Visual Appearance:** Golden amber gradient background with a left border, verse reference in the top-left corner, and Bible version badge in the top-right. Text appears in a serif font with increased size and italic styling.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `verse` | string | Yes | - | The Bible verse reference (e.g., "John 3:16") |
| `version` | string | No | "NIV" | Bible translation version |
| `children` | content | Yes | - | The actual scripture text |

**Usage Example:**

```mdx
<Scripture verse="Philippians 4:6-7" version="NIV">
Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.
</Scripture>
```

**When to Use:**
- When quoting a full Bible verse or passage
- When you want to emphasize scripture as the foundation of your point
- For key verses that deserve special visual prominence

**When NOT to Use:**
- For brief scripture references within a paragraph (use regular text with italics)
- For more than 3-4 verses per post (becomes visually overwhelming)

**Tips:**
- Keep verse text to 2-5 sentences maximum for readability
- Always include the verse reference and version for proper attribution
- Use this component for verses you want readers to remember

**Mobile Considerations:**
- Adapts padding from 8 units on desktop to 6 units on mobile
- Font size reduces from xl (20px) to lg (18px) on mobile
- Maintains full readability on small screens

---

### KeyTakeaway

**Purpose:** Present a summary of key points in a collapsible box that readers can expand/collapse.

**Visual Appearance:** Teal-colored box with a clipboard icon. The title bar is clickable and includes a chevron icon that rotates when toggled. Opens by default but users can collapse it to reduce visual clutter.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | string | No | "Key Takeaways" | Custom title for the section |
| `children` | content | Yes | - | The takeaway content (typically a bulleted list) |

**Usage Example:**

```mdx
<KeyTakeaway title="What You'll Learn">
- 10 powerful scripture passages for anxiety and depression
- How to apply biblical truth to mental health struggles
- Practical steps for finding peace through God's Word
- When to seek professional help alongside spiritual support
</KeyTakeaway>
```

**With Default Title:**

```mdx
<KeyTakeaway>
- Marriage requires daily effort and commitment
- Prayer together strengthens your bond
- Forgiveness is essential for healing
- Professional counseling can help when needed
</KeyTakeaway>
```

**When to Use:**
- Near the beginning of long posts to give readers a roadmap
- To summarize main points from a section
- When listing action items or important concepts

**Content Tips:**
- Use bullet points (dashes in MDX) for easy scanning
- Keep to 3-6 items maximum
- Start each bullet with an action verb or clear concept
- Each bullet should be a complete thought

**Accessibility:**
- Fully keyboard accessible with proper ARIA labels
- Screen readers announce expand/collapse state
- Button has minimum 44px touch target for mobile

**Mobile Considerations:**
- Button padding increases from 3 to 4 units on mobile for easier tapping
- Smooth transitions work on all devices
- Collapsing saves screen space on mobile

---

### ApplicationStep

**Purpose:** Break down multi-step processes or action items with numbered visual indicators.

**Visual Appearance:** Each step displays a circular badge with the step number in teal, followed by a bold title and description text. Steps have a subtle hover effect that slightly enlarges them.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `number` | number | Yes | - | Step number (e.g., 1, 2, 3) |
| `title` | string | Yes | - | Brief title for the step |
| `children` | content | Yes | - | Detailed description or instructions |

**Usage Example:**

```mdx
## How to Start a Prayer Practice

<ApplicationStep number={1} title="Choose a Consistent Time">
Select a specific time each day when you're least likely to be interrupted. Many people find morning prayer sets a positive tone for the day, while others prefer evening reflection. The key is consistency, not perfection.
</ApplicationStep>

<ApplicationStep number={2} title="Create a Sacred Space">
Designate a quiet spot in your home for prayer. It doesn't need to be elaborate—a comfortable chair, a Bible, and perhaps a journal are enough. This physical space signals to your mind that it's time to focus on God.
</ApplicationStep>

<ApplicationStep number={3} title="Start with Scripture">
Begin by reading a short Bible passage to center your thoughts on God's Word. Psalms are particularly good for this. Let the scripture guide your prayers rather than starting with your requests.
</ApplicationStep>
```

**When to Use:**
- When teaching a process with 3+ sequential steps
- For "How to" sections in your blog posts
- When readers need clear, actionable instructions
- For breaking down complex practices into manageable parts

**Content Guidelines:**
- Use 3-7 steps (fewer than 3 doesn't need this component, more than 7 becomes overwhelming)
- Keep titles brief (3-7 words)
- Include 2-4 sentences in the description
- Use conversational, encouraging language

**Sequential Numbering:**
Always number your steps consecutively: `{1}`, `{2}`, `{3}`, etc. Don't skip numbers.

**Mobile Considerations:**
- Number badges adjust from 12px to 11px on mobile
- Gap between number and text reduces from 6 to 4 units on mobile
- Hover effect becomes a tap effect on touch devices
- All text remains fully readable

---

### CallToAction

**Purpose:** Encourage readers to take a specific action, such as registering, joining a program, or exploring a resource.

**Visual Appearance:** Bold teal gradient background with white text, centered layout. Includes a prominent white button with hover effects. Designed to stand out as a clear conversion point.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | string | Yes | - | Headline for the CTA |
| `description` | string | Yes | - | Supporting text explaining the action |
| `buttonText` | string | No | "Get Started" | Text displayed on the button |
| `buttonLink` | string | No | "/register" | URL the button links to |
| `variant` | string | No | "primary" | Visual style variant (currently only "primary") |

**Usage Example:**

```mdx
<CallToAction
  title="Ready to Find Biblical Guidance?"
  description="Connect with a licensed Christian counselor who understands your faith and can provide professional support grounded in Scripture."
  buttonText="Find a Counselor"
  buttonLink="/register"
/>
```

**Minimal Example (Using Defaults):**

```mdx
<CallToAction
  title="Join Our Community"
  description="Get support from other Christians walking the same journey."
/>
```

**When to Use:**
- At the end of posts to convert readers into users
- After compelling content that addresses a reader's pain point
- When directing readers to relevant resources or tools
- Maximum 1-2 CTAs per blog post

**When NOT to Use:**
- Multiple times in a single post (becomes spammy)
- Before building value and trust in the content
- With generic, non-specific offers

**Writing Tips:**
- **Title**: Make it benefit-focused and action-oriented
- **Description**: Address the reader's need or desire
- **Button Text**: Use specific action verbs ("Find", "Join", "Start", "Discover")
- Keep the total message concise—this should be scannable in 3 seconds

**Common Button Links:**
- `/register` - New user registration
- `/counselors` - Browse counselors
- `/resources` - Resource library
- `/blog/category/mental-health` - Category pages

**Mobile Considerations:**
- Padding adjusts from 12 to 8 units on mobile
- Text sizes reduce appropriately (3xl to 2xl for title, lg to base for description)
- Button remains prominent and easily tappable
- Maintains visual impact on small screens

---

### Warning

**Purpose:** Alert readers to serious concerns, crisis resources, or important cautions.

**Visual Appearance:** Colored box with a warning triangle icon. Two severity levels: "crisis" (red) for emergencies and "caution" (orange) for important notices.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `severity` | string | No | "crisis" | Either "crisis" or "caution" |
| `children` | content | Yes | - | The warning message |

**Usage Example (Crisis):**

```mdx
<Warning severity="crisis">
If you're experiencing thoughts of suicide, please reach out immediately:

- **National Suicide Prevention Lifeline:** 1-800-273-8255
- **Crisis Text Line:** Text HOME to 741741
- **Emergency Services:** Call 911

You are not alone, and help is available 24/7.
</Warning>
```

**Usage Example (Caution):**

```mdx
<Warning severity="caution">
While prayer and Scripture are powerful tools for mental health, they should complement—not replace—professional care. If you're experiencing severe depression or anxiety, please consult with a licensed mental health professional.
</Warning>
```

**When to Use "crisis":**
- Suicide risk or self-harm concerns
- Domestic violence situations
- Immediate safety concerns
- Emergency mental health crises

**When to Use "caution":**
- Important disclaimers (e.g., "not medical advice")
- Clarifications about seeking professional help
- Warnings about common misunderstandings
- Important context readers need before proceeding

**Content Guidelines:**
- Be direct and clear—no ambiguity in warnings
- Include specific resources or hotline numbers when relevant
- Keep crisis warnings brief but actionable
- For caution warnings, explain why the warning matters

**Accessibility:**
- Uses proper ARIA `role="alert"` for screen readers
- Semantic color coding helps all users understand severity
- High contrast ratios ensure text readability

**Mobile Considerations:**
- Icon and text remain clearly visible on mobile
- Phone numbers in crisis warnings are automatically tappable links on mobile devices
- Maintains urgent visual appearance across all screen sizes

---

### PrayerPrompt

**Purpose:** Provide a guided prayer or prayer starter to help readers connect with God about the topic.

**Visual Appearance:** Soft purple background with a centered layout and bell icon. Text appears in a serif italic font, creating a reverent, contemplative feel.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | string | No | "Prayer Prompt:" | Custom title for the prayer section |
| `children` | content | Yes | - | The prayer text or prayer prompt |

**Usage Example:**

```mdx
<PrayerPrompt>
Lord, I bring my anxious thoughts to You today. Help me to trust in Your presence even when I can't feel You near. Give me the strength to take one step forward, and the wisdom to seek help when I need it. Remind me that You are close to the brokenhearted, and that my struggles don't separate me from Your love. In Jesus' name, Amen.
</PrayerPrompt>
```

**With Custom Title:**

```mdx
<PrayerPrompt title="A Prayer for Your Marriage:">
Heavenly Father, we invite You into our marriage today. Soften our hearts toward each other, help us to forgive as You've forgiven us, and give us the courage to love sacrificially. Teach us to prioritize our relationship and to seek Your wisdom in our conflicts. Amen.
</PrayerPrompt>
```

**When to Use:**
- At the end of posts to help readers apply content spiritually
- After discussing difficult or emotional topics
- When you want to model turning to God in prayer
- To provide a starting point for readers who struggle with prayer

**Writing Prayer Prompts:**
- Write in first-person ("I" or "we") so readers can pray along
- Keep it 3-5 sentences for a prayer prompt, longer for a full prayer
- Address specific themes from your blog post
- Include acknowledgment of struggle, a request for help, and trust in God
- End with "Amen" or "In Jesus' name, Amen"

**Alternative Formats:**
You can also use this component for prayer starters rather than full prayers:

```mdx
<PrayerPrompt title="Prayer Starter:">
Take a moment to talk to God about:
- What anxieties you're carrying today
- Where you need His strength
- How you want to see Him work in your situation
</PrayerPrompt>
```

**Mobile Considerations:**
- Padding adjusts from 8 to 6 units on mobile
- Font size reduces from lg to base on mobile
- Icon size remains consistent and visible
- Centered text maintains reverent appearance

---

## Best Practices

### 1. Component Balance

**Don't Overuse Components:**
- Not every paragraph needs a component
- Too many special components reduce their impact
- Aim for 70% regular content, 30% component-enhanced content

**Good Component Distribution:**
```
- Introduction (text)
- KeyTakeaway
- Section 1 (text with headings)
- Scripture
- Section 2 (text)
- ApplicationStep (3-5 steps)
- Section 3 (text)
- Warning (if needed)
- Conclusion (text)
- PrayerPrompt
- CallToAction
```

### 2. Visual Hierarchy

**Create Scanning Paths:**
- Use regular markdown headings (##, ###) to break up text
- Place components strategically to draw the eye
- Alternate between text-heavy sections and visual components

**Heading Guidelines:**
- `#` (H1): Only in the title—automatically generated from frontmatter
- `##` (H2): Main sections
- `###` (H3): Subsections
- `####` (H4): Use sparingly, only when truly needed

### 3. Content Length

**Optimal Blog Post Structure:**
- **Introduction:** 100-200 words
- **Body:** 800-1,500 words total (broken into 3-5 sections)
- **Conclusion:** 100-150 words
- **Total:** 1,000-2,000 words for best engagement

**Paragraph Length:**
- Keep paragraphs to 2-4 sentences
- Break up long paragraphs with subheadings
- Use single-sentence paragraphs occasionally for emphasis

### 4. Combining Components

**Components That Work Well Together:**

```mdx
<!-- Lead with value proposition -->
<KeyTakeaway>
[Main points]
</KeyTakeaway>

<!-- Support with Scripture -->
<Scripture verse="Reference">
[Verse text]
</Scripture>

<!-- Provide practical steps -->
<ApplicationStep number={1} title="Title">
[Instructions]
</ApplicationStep>

<!-- Close with prayer and action -->
<PrayerPrompt>
[Prayer]
</PrayerPrompt>

<CallToAction title="Title" description="Description" />
```

### 5. SEO and Readability

**Writing for Search Engines and Humans:**
- Include your main keyword in the title, first paragraph, and 2-3 section headings
- Use descriptive alt text for images (when image support is added)
- Write meta descriptions (excerpt) that include a call-to-action
- Use bullet points and numbered lists for scannability

**Keyword Usage:**
- Natural integration only—never stuff keywords
- Use variations and related terms
- Focus on search intent: what is the reader trying to accomplish?

### 6. Tone and Voice

**Christian Counseling Voice:**
- Compassionate but professional
- Theologically sound without being preachy
- Action-oriented and practical
- Honest about struggles (avoid toxic positivity)
- Inclusive of different denominational backgrounds

**Examples:**

**Good:** "Many Christians struggle with anxiety, and that's nothing to be ashamed of. Let's explore what Scripture says and how we can apply it practically."

**Avoid:** "Just pray more and your anxiety will disappear." (Oversimplified, dismissive)

**Avoid:** "Anxiety is a sin that shows lack of faith." (Condemning, theologically questionable)

### 7. Accessibility

**Writing Accessible Content:**
- Use descriptive link text (not "click here")
- Structure content with proper heading hierarchy
- Write in plain language (8th-grade reading level)
- Define jargon or theological terms when first used

**Component Accessibility:**
All components are built with accessibility in mind:
- Keyboard navigation works throughout
- Screen readers announce interactive elements properly
- Color is not the only indicator of meaning
- Touch targets meet mobile accessibility standards (44px minimum)

---

## Mobile Considerations

All components are fully responsive and optimized for mobile devices. Here's what happens automatically:

### Responsive Design Features

**Layout Adjustments:**
- Components stack vertically on narrow screens
- Padding and spacing reduce proportionally
- Text sizes adjust for readability
- Touch targets enlarge for easier tapping

**Typography:**
- Desktop: Larger text sizes (lg, xl, 2xl, 3xl)
- Mobile: Adjusted sizes (base, lg, xl, 2xl)
- Line height remains comfortable for reading
- Font weights and styles maintain hierarchy

**Interactive Elements:**
- Buttons meet 44px minimum touch target
- Clickable areas don't require precision tapping
- Hover effects become tap effects
- Focus states are visible for keyboard users

### Testing Your Content on Mobile

**Before Publishing:**
1. Preview your blog post on a mobile device (or use browser dev tools)
2. Check that all components render correctly
3. Verify that long titles or Scripture verses don't break layout
4. Test any links in Warning components (phone numbers should be tappable)
5. Ensure reading flow feels natural on small screens

**Common Mobile Issues to Avoid:**
- Very long single-line headings (break them into multiple lines naturally)
- Too many components in a row (break them up with text)
- Extremely long Scripture quotes (consider shortening or splitting)
- Tables or complex layouts (use lists instead)

---

## Quick Reference

### When to Use Each Component

| Component | Primary Use Case | Placement |
|-----------|------------------|-----------|
| **Scripture** | Highlight Bible verses | Throughout post when quoting Scripture |
| **KeyTakeaway** | Summarize main points | Near beginning or at section ends |
| **ApplicationStep** | Multi-step instructions | In "How to" sections |
| **CallToAction** | Drive user action | End of post (1-2 max per post) |
| **Warning** | Safety/crisis info | As needed, especially in mental health posts |
| **PrayerPrompt** | Guide prayer/reflection | End of post or after heavy topics |

### Markdown Basics Reminder

```mdx
# Heading 1 (automatic from frontmatter—don't use)
## Heading 2
### Heading 3

**Bold text**
*Italic text*

- Bullet point
- Another bullet point

1. Numbered list
2. Second item

[Link text](https://example.com)

> Blockquote (use for brief Scripture references or quotes)
```

---

## Need Help?

**Resources:**
- Full implementation plan: `/docs/plans/2026-01-20-comprehensive-blog-formatting-plan.md`
- Component source code: `/packages/web/src/components/blog/`
- Example blog posts: `/packages/web/content/blog/`

**Questions?**
Reach out to the development team for guidance on:
- Custom component requests
- Technical issues with MDX rendering
- SEO optimization
- Accessibility concerns

---

**Last Updated:** 2026-01-25
**Version:** 1.0
**Maintained by:** MyChristianCounselor Development Team
