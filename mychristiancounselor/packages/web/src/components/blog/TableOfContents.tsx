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
