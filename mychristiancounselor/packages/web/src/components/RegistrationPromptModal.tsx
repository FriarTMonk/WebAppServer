'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface RegistrationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegistrationPromptModal({ isOpen, onClose }: RegistrationPromptModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="absolute right-4 top-4">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex items-center justify-center mb-4">
                  <div className="rounded-full bg-indigo-100 p-3">
                    <SparklesIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-2"
                >
                  Create an Account to Continue
                </Dialog.Title>

                <div className="mt-4">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Save your conversation and unlock more features with a free account.
                  </p>

                  <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-2">
                      Free Account Benefits:
                    </h4>
                    <ul className="text-sm text-indigo-800 space-y-1">
                      <li>✓ Up to 3 clarifying questions per conversation</li>
                      <li>✓ Save your conversation history</li>
                      <li>✓ Access your spiritual journal anytime</li>
                      <li>✓ Continue conversations across sessions</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">
                      💎 Premium Benefits:
                    </h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>✓ Up to 9 clarifying questions</li>
                      <li>✓ Share sessions with your counselor</li>
                      <li>✓ Export conversations as PDF</li>
                      <li>✓ Add private notes to sessions</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/register"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Create Free Account
                  </Link>
                  <Link
                    href="/login"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Sign In
                  </Link>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
                  onClick={onClose}
                >
                  Continue as guest
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
