import type { MDXComponents } from 'mdx/types';
import Scripture from './Scripture';
import KeyTakeaway from './KeyTakeaway';
import ApplicationStep from './ApplicationStep';
import CallToAction from './CallToAction';
import Warning from './Warning';
import PrayerPrompt from './PrayerPrompt';
import CopyLinkButton from './CopyLinkButton';

// Extract text from React children recursively
function extractText(children: any): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (children?.props?.children) {
    return extractText(children.props.children);
  }
  return '';
}

// Generate slug from heading text
function generateId(children: any): string {
  const text = extractText(children);

  if (!text || text.trim().length === 0) {
    // Fallback: generate a random ID if no text found
    return `heading-${Math.random().toString(36).substr(2, 9)}`;
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Export component map for MDXRemote
export const mdxComponents: MDXComponents = {
  Scripture,
  KeyTakeaway,
  ApplicationStep,
  CallToAction,
  Warning,
  PrayerPrompt,
  // Enhanced standard HTML elements
  h2: ({ id, children, ...props }: any) => {
    // Ensure we always have a valid ID
    const headingId = id && id.trim() !== ''
      ? id
      : generateId(children) || `h2-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <h2
        id={headingId}
        className="group text-3xl font-bold text-gray-900 mt-12 mb-6 scroll-mt-24 flex items-center"
        {...props}
      >
        {children}
        <CopyLinkButton headingId={headingId} />
      </h2>
    );
  },
  h3: ({ id, children, ...props }: any) => {
    // Ensure we always have a valid ID
    const headingId = id && id.trim() !== ''
      ? id
      : generateId(children) || `h3-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <h3
        id={headingId}
        className="group text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24 flex items-center"
        {...props}
      >
        {children}
        <CopyLinkButton headingId={headingId} />
      </h3>
    );
  },
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-teal-600 pl-6 py-2 my-6 bg-teal-50 italic text-gray-800"
      {...props}
    />
  ),
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
};
