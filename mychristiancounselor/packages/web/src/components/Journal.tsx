'use client';

import React from 'react';

interface JournalConversation {
  id: string;
  title: string;
  excerpt?: string;
  createdAt: string;
  noteCount?: number;
  topics?: any;
}

interface JournalProps {
  conversations: JournalConversation[];
  userRole: 'owner' | 'counselor' | 'viewer';
  activeTab?: 'active' | 'archived';
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  onSelectConversation: (id: string) => void;
  onSearchChange?: (query: string) => void;
  onDateFromChange?: (date: string) => void;
  onDateToChange?: (date: string) => void;
  onApplyFilters?: () => void;
  onTabChange?: (tab: 'active' | 'archived') => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onShare?: (id: string, title: string) => void;
  showFilters?: boolean;
  showTabs?: boolean;
  showActions?: boolean;
  emptyMessage?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
}

export function Journal({
  conversations,
  userRole,
  activeTab = 'active',
  searchQuery = '',
  dateFrom = '',
  dateTo = '',
  onSelectConversation,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onApplyFilters,
  onTabChange,
  onArchive,
  onRestore,
  onShare,
  showFilters = true,
  showTabs = true,
  showActions = true,
  emptyMessage = 'No conversations found.',
  emptyActionText,
  onEmptyAction,
}: JournalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const parseTopics = (topics: any): string[] => {
    if (Array.isArray(topics)) return topics;
    if (typeof topics === 'string') {
      try {
        const parsed = JSON.parse(topics);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const canArchive = userRole === 'owner';
  const canShare = userRole === 'owner';

  return (
    <div>
      {/* Filters and Tabs */}
      {showFilters && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="space-y-4">
            {onSearchChange && (
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                data-tour="search-box"
              />
            )}

            {onDateFromChange && onDateToChange && (
              <div className="flex gap-4" data-tour="date-filters">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}

            {onApplyFilters && (
              <button
                onClick={onApplyFilters}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            )}
          </div>

          {showTabs && onTabChange && (
            <div className="mt-4 flex gap-2" data-tour="active-archived-tabs">
              <button
                onClick={() => onTabChange('active')}
                className={`flex-1 px-4 py-2 rounded-md ${
                  activeTab === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => onTabChange('archived')}
                className={`flex-1 px-4 py-2 rounded-md ${
                  activeTab === 'archived'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Archived
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">{emptyMessage}</p>
          {emptyActionText && onEmptyAction && (
            <button
              onClick={onEmptyAction}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {emptyActionText}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              data-tour="conversation-card"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <h2
                    onClick={() => onSelectConversation(conversation.id)}
                    className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                  >
                    {conversation.title}
                  </h2>
                  {conversation.noteCount && conversation.noteCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium"
                      title={`${conversation.noteCount} note${conversation.noteCount === 1 ? '' : 's'}`}
                      data-tour="note-badge"
                    >
                      📝 {conversation.noteCount}
                    </span>
                  )}
                </div>
                {showActions && (
                  <div className="flex gap-2 ml-4">
                    {activeTab === 'active' && (
                      <>
                        {canShare && onShare && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShare(conversation.id, conversation.title);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                            data-tour="share-button"
                          >
                            Share
                          </button>
                        )}
                        {canArchive && onArchive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchive(conversation.id);
                            }}
                            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                            data-tour="archive-button"
                          >
                            Archive
                          </button>
                        )}
                      </>
                    )}
                    {activeTab === 'archived' && onRestore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestore(conversation.id);
                        }}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                        data-tour="restore-button"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                )}
              </div>

              {conversation.excerpt && <p className="text-gray-700 mb-3">{conversation.excerpt}</p>}

              {parseTopics(conversation.topics).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {parseTopics(conversation.topics).map((topic, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{formatDate(conversation.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
