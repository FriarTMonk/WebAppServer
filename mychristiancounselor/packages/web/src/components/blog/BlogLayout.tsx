'use client';

import React from 'react';
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
