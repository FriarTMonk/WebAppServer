'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOrganizations, setHasOrganizations] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const token = getAccessToken();
      if (token) {
        fetch(`${API_URL}/organizations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.ok ? res.json() : [])
          .then(data => setHasOrganizations(Array.isArray(data) && data.length > 0))
          .catch(() => setHasOrganizations(false));
      }
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sign in
        </button>
        <button
          onClick={() => router.push('/register')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user?.firstName?.[0] || user?.email[0].toUpperCase()}
        </div>
        <span>{user?.firstName || user?.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            {user?.email}
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/profile');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/history');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            History
          </button>
          {hasOrganizations && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/organizations');
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Organizations
            </button>
          )}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
              router.push('/');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
