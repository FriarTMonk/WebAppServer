import { BibleTranslation, TranslationInfo } from '../types';

// Bible Translation Metadata - Multiple translations available
export const TRANSLATIONS: Record<BibleTranslation, TranslationInfo> = {
  KJV: {
    code: 'KJV',
    name: 'KJV',
    fullName: 'King James Version',
    description: 'Classic English translation with majestic literary style and Strong\'s concordance support',
    yearPublished: 1611,
    characteristics: ['Traditional', 'Poetic', 'Widely memorized', 'Strong\'s numbers available'],
  },
  ASV: {
    code: 'ASV',
    name: 'ASV',
    fullName: 'American Standard Version',
    description: 'Literal translation emphasizing accuracy, updated from KJV with modern scholarship',
    yearPublished: 1901,
    characteristics: ['Highly literal', 'Scholarly', 'Public domain', 'Strong\'s numbers available'],
  },
  NIV: {
    code: 'NIV',
    name: 'NIV',
    fullName: 'New International Version',
    description: 'Popular modern translation balancing accuracy and readability',
    yearPublished: 1978,
    characteristics: ['Contemporary', 'Balanced', 'Widely used', 'Thought-for-thought'],
  },
  ESV: {
    code: 'ESV',
    name: 'ESV',
    fullName: 'English Standard Version',
    description: 'Literal translation with modern English, emphasizing word-for-word accuracy',
    yearPublished: 2001,
    characteristics: ['Literal', 'Modern', 'Scholarly', 'Word-for-word'],
  },
  NASB: {
    code: 'NASB',
    name: 'NASB',
    fullName: 'New American Standard Bible',
    description: 'Highly literal translation prioritizing accuracy to original texts',
    yearPublished: 1971,
    characteristics: ['Very literal', 'Scholarly', 'Precise', 'Word-for-word'],
  },
  NKJV: {
    code: 'NKJV',
    name: 'NKJV',
    fullName: 'New King James Version',
    description: 'Modern update of KJV preserving traditional style with contemporary language',
    yearPublished: 1982,
    characteristics: ['Traditional style', 'Modern language', 'Poetic', 'Accessible'],
  },
  NLT: {
    code: 'NLT',
    name: 'NLT',
    fullName: 'New Living Translation',
    description: 'Highly readable translation emphasizing clear, natural English',
    yearPublished: 1996,
    characteristics: ['Very readable', 'Contemporary', 'Thought-for-thought', 'Accessible'],
  },
  YLT: {
    code: 'YLT',
    name: 'YLT',
    fullName: "Young's Literal Translation",
    description: 'Extremely literal translation preserving original word order and tense',
    yearPublished: 1862,
    characteristics: ['Extremely literal', 'Public domain', 'Preserves Greek/Hebrew structure', 'Study Bible'],
  },
};

export const DEFAULT_TRANSLATION: BibleTranslation = 'ASV';

// Bible book names for validation
export const BIBLE_BOOKS = [
  // Old Testament
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
  'Zechariah', 'Malachi',
  // New Testament
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
] as const;

// Crisis detection patterns - organized by category for comprehensive coverage
export const CRISIS_KEYWORDS = [
  // Suicidal ideation
  'suicide',
  'suicidal',
  'kill myself',
  'killing myself',
  'end my life',
  'ending my life',
  'take my life',
  'taking my life',
  'want to die',
  'wanted to die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'ending it all',
  'no reason to live',
  'not worth living',
  'life is not worth',
  'can\'t go on',
  'cannot go on',

  // Self-harm (expanded with variations)
  'self harm',
  'self-harm',
  'selfharm',
  'hurt myself',
  'hurting myself',
  'harm myself',
  'harming myself',
  'cut myself',
  'cutting myself',
  'burn myself',
  'burning myself',
  'injure myself',
  'injuring myself',
  'mutilate',
  'mutilating',
  'self injury',
  'self-injury',
  'self mutilation',

  // Abuse
  'abuse',
  'abused',
  'abusing',
  'being abused',
  'domestic violence',
  'domestic abuse',
  'physical abuse',
  'sexual abuse',
  'emotional abuse',
  'being hurt by',
  'being beaten',
  'beaten',
  'beating me',
  'hitting me',
  'hurting me',
  'violent',
  'violence at home',
  'raped',
  'raping',
  'being raped',
  'rape',
  'sexual assault',
  'sexually assaulted',
  'molested',
  'molesting',

  // Additional crisis indicators
  'overdose',
  'overdosing',
  'pills to die',
  'jump off',
  'hanging myself',
  'drown myself',
  'shoot myself',
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

// Grief-related keywords for detecting loss and bereavement - organized by category
export const GRIEF_KEYWORDS = [
  // Death and loss - expanded variations
  'died',
  'death',
  'death of',
  'passed away',
  'passed on',
  'passing away',
  'passing on',
  'lost my',
  'lost a',
  'lost our',
  'losing my',
  'losing a',
  'losing our',
  'loss of',
  'the loss',
  'funeral',
  'funerals',
  'buried',
  'burial',
  'bury',
  'burying',
  'mourning',
  'mourn',
  'grieving',
  'grieve',
  'grief',
  'bereavement',
  'bereaved',
  'memorial',
  'memorial service',
  'wake',
  'visitation',
  'laying to rest',
  'laid to rest',
  'no longer with us',
  'gone from us',
  'left us',
  'departed',

  // Terminal illness and end of life
  'terminal',
  'terminally ill',
  'terminal illness',
  'terminal cancer',
  'terminal disease',
  'dying',
  'is dying',
  'are dying',
  'end of life',
  'end stage',
  'hospice',
  'hospice care',
  'palliative',
  'palliative care',
  'comfort care',
  'final days',
  'final hours',
  'final moments',
  'last days',
  'last hours',
  'not long to live',
  'not much time left',
  'time is running out',
  'counting days',

  // Suffering of loved ones
  'suffering',
  'is suffering',
  'are suffering',
  'in pain',
  'in so much pain',
  'very sick',
  'very ill',
  'seriously ill',
  'seriously sick',
  'critically ill',
  'critical condition',
  'intensive care',
  'icu',
  'life support',
  'on life support',
  'ventilator',
  'won\'t make it',
  'not going to make it',
  'not gonna make it',
  'losing the battle',
  'losing their fight',
  'losing her fight',
  'losing his fight',
  'gave up the fight',
  'fighting for life',
  'fighting for their life',
  'fighting for his life',
  'fighting for her life',

  // Specific relationships
  'lost my mother',
  'lost my father',
  'lost my mom',
  'lost my dad',
  'lost my parent',
  'lost my parents',
  'lost my child',
  'lost my son',
  'lost my daughter',
  'lost my baby',
  'lost my wife',
  'lost my husband',
  'lost my spouse',
  'lost my partner',
  'lost my friend',
  'lost my brother',
  'lost my sister',
  'lost my grandmother',
  'lost my grandfather',
  'lost my grandma',
  'lost my grandpa',

  // Emotional expressions of grief
  'heartbroken',
  'heart broken',
  'devastated',
  'empty without',
  'miss them so much',
  'miss him so much',
  'miss her so much',
  'can\'t believe they\'re gone',
  'can\'t believe he\'s gone',
  'can\'t believe she\'s gone',
  'wish they were here',
  'wish he was here',
  'wish she was here',
  'life without',
  'gone too soon',
  'taken too soon',
  'left a void',
  'hole in my heart',
];

export const GRIEF_RESOURCES: Array<{
  name: string;
  contact: string;
  description: string;
}> = [
  {
    name: 'GriefShare',
    contact: 'www.griefshare.org or 1-800-395-5755',
    description: 'Faith-based grief support groups and resources',
  },
  {
    name: 'The Compassionate Friends',
    contact: '1-877-969-0010 or www.compassionatefriends.org',
    description: 'Support for families who have lost a child',
  },
  {
    name: 'National Alliance for Grieving Children',
    contact: 'www.childrengrieve.org',
    description: 'Resources for children dealing with loss',
  },
];

export const MAX_CLARIFYING_QUESTIONS = 3;
export const SESSION_TIMEOUT_MINUTES = 60;

// Alignment score thresholds used for book evaluation
export const ALIGNMENT_SCORE_THRESHOLDS = {
  GLOBALLY_ALIGNED: 90,
  CONCEPTUALLY_ALIGNED: 70,
} as const;
