export interface Session {
  id: string;
  userId: string | null;
  title: string;
  messages: Message[];
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scriptureReferences: ScriptureReference[];
  timestamp: Date;
}

export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: 'NIV';
  text: string;
}

export interface CounselRequest {
  sessionId: string;
  message: string;
}

export interface CounselResponse {
  sessionId: string;
  message: Message;
  requiresClarification: boolean;
  clarifyingQuestion?: string;
  isCrisisDetected: boolean;
  crisisResources?: CrisisResource[];
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
}
