import type { MDXComponents } from 'mdx/types';
import Scripture from './Scripture';
import KeyTakeaway from './KeyTakeaway';
import ApplicationStep from './ApplicationStep';
import CallToAction from './CallToAction';
import Warning from './Warning';
import PrayerPrompt from './PrayerPrompt';
import CopyLinkButton from './CopyLinkButton';

// Export component map for MDXRemote
export const mdxComponents: MDXComponents = {
  Scripture,
  KeyTakeaway,
  ApplicationStep,
  CallToAction,
  Warning,
  PrayerPrompt,
  // Enhanced standard HTML elements
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
