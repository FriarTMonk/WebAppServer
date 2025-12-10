'use client';

import { ConversationView } from '../../components/ConversationView';

/**
 * Home Page - Conversation View
 *
 * Unix Principles Applied:
 * - Single purpose: Provide counseling conversation interface
 * - Open access: Anonymous and authenticated users both welcome
 * - Simple: Just show the conversation view
 *
 * Both authenticated and anonymous users can access this page.
 * Anonymous users will be prompted to register after a few questions.
 * ConversationView handles registration prompts internally.
 */
export default function HomePage() {
  return <ConversationView />;
}
