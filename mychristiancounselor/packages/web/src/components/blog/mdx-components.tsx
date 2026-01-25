import type { MDXComponents } from 'mdx/types';
import Scripture from './Scripture';
import KeyTakeaway from './KeyTakeaway';
import ApplicationStep from './ApplicationStep';

// Placeholder components (will be built in Phase 2)

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
