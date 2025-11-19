'use client';

import { ReactNode, useState } from 'react';

interface TabProps {
  id: string;
  label: string;
  count?: number;
  children: ReactNode;
}

interface TabsProps {
  defaultTab?: string;
  children: ReactNode;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

export function Tabs({ defaultTab, children }: TabsProps) {
  // Extract tabs from children
  const tabs = Array.isArray(children) ? children : [children];
  const [activeTab, setActiveTab] = useState(
    defaultTab || tabs[0]?.props?.id || ''
  );

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.props.id;
            return (
              <button
                key={tab.props.id}
                onClick={() => setActiveTab(tab.props.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.props.label}
                {tab.props.count !== undefined && (
                  <span
                    className={`
                      ml-2 py-0.5 px-2 rounded-full text-xs
                      ${
                        isActive
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }
                    `}
                  >
                    {tab.props.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {tabs.map((tab) => (
          <div
            key={tab.props.id}
            className={activeTab === tab.props.id ? 'block' : 'hidden'}
          >
            {tab.props.children}
          </div>
        ))}
      </div>
    </div>
  );
}
