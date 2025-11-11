export const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'ending it all',
  'no reason to live',
  'self harm',
  'hurt myself',
  'abuse',
  'being abused',
  'domestic violence',
];

export const CRISIS_RESOURCES: Array<{
  name: string;
  contact: string;
  description: string;
}> = [
  {
    name: 'National Suicide Prevention Lifeline',
    contact: '988',
    description: '24/7 crisis support for suicidal thoughts',
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    description: 'Text-based crisis support',
  },
  {
    name: 'National Domestic Violence Hotline',
    contact: '1-800-799-7233',
    description: '24/7 support for domestic violence situations',
  },
];

export const MAX_CLARIFYING_QUESTIONS = 3;
export const SESSION_TIMEOUT_MINUTES = 60;
