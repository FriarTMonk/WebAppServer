# Biblical Resources & Organization Recommendation System Design

**Date:** 2025-12-23
**Status:** Approved for Implementation

## Executive Summary

A comprehensive resource management system that enables organizations to add Christian books and recommend support organizations, with AI-powered theological evaluation ensuring biblical alignment. Resources are automatically shared based on alignment scores, integrated into counseling sessions, and accessible through personal reading lists.

## Problem Statement

Currently, MyChristianCounselor provides scripture-based AI guidance but lacks:
1. A curated library of Christian books to recommend for deeper study
2. Regional crisis/support organization referrals
3. Personal resource tracking for users' spiritual growth journey
4. Quality control ensuring recommended materials are biblically sound

This limits the platform's ability to provide comprehensive, ongoing support beyond individual counseling sessions.

## Goals

### Primary Goals
1. Enable organizations to build biblically-sound resource libraries
2. Integrate book recommendations naturally into counseling conversations
3. Provide regional organization referrals for specialized support needs
4. Maintain theological integrity through AI-powered evaluation
5. Create engagement through personal reading lists and progress tracking

### Secondary Goals
1. Minimize human curation to prevent gaming the system
2. Support multiple book input methods (ISBN, URL, manual entry)
3. Handle copyright/licensing appropriately
4. Age-gate mature content while maintaining access to biblically-sound resources
5. Enable global resource sharing when appropriate

## Design Principles

1. **Biblical Authority** - Scripture is the standard, not denominational traditions (Sola Scriptura)
2. **Minimal Human Override** - AI evaluation maintains integrity, prevents manipulation
3. **One Book, One Evaluation** - Efficiency through deduplication and score permanence
4. **Genre-Appropriate Evaluation** - Fiction vs non-fiction evaluated differently
5. **Progressive Engagement** - Resources deepen user connection to the platform
6. **Copyright Respect** - Conservative approach to PDF sharing and licensing

## Core Architecture

### Book Management System

#### Book Entry Methods

**1. ISBN/URL Lookup (Preferred)**
- User provides ISBN, Amazon link, Google Books URL, or Christian bookstore link
- System cascades through lookup services:
  1. Christian bookstore APIs (Christianbook.com, LifeWay)
  2. Google Books API
  3. Amazon API
  4. Manual entry fallback
- Auto-populates: Title, Author, Publisher, Publication Year, Description, ISBN, Cover image

**2. Manual Entry**
- Required fields: Title, Author
- Optional fields: Publisher, Publication Year, Description, ISBN, Cover image URL
- AI can enhance/validate provided data

**3. PDF Upload**
- Optional at time of entry or can be added later
- When PDF uploaded, system extracts title and author from PDF metadata/first pages (overrides user-entered values for accuracy)
- **Completeness validation:** AI verifies PDF contains full book (not excerpts/chapters) - checks for introduction, chapters, conclusion
- Partial PDFs rejected with message: "Please upload the complete book, not excerpts or individual chapters"
- Enables deeper theological analysis
- Used for AI reference in counseling (if ≥90% aligned)
- License type selection required for sharing (Public Domain, Creative Commons, Publisher Permission, Analysis-Only)

#### Duplicate Detection

Books are considered duplicates when:
1. **Exact ISBN match** - Same ISBN = same book
2. **AI fuzzy matching** - Title + Author similarity (handles "C.S. Lewis" vs "CS Lewis", subtitle variations)

When duplicate detected:
- Show existing book's score and visibility level
- Add current organization as endorser
- No re-evaluation (uses existing score)
- Display: "This book already exists with 92% alignment. Your organization will be added as an endorser."

### Theological Evaluation System

#### AI Models

**Cascading Approach:**
1. **Primary evaluation:** Claude Sonnet 4.5 (~$3 per book)
2. **Borderline escalation:** Claude Opus 4.5 for scores within 3% of thresholds
   - 67-73% (near not-aligned/conceptually-aligned boundary)
   - 87-93% (near conceptually-aligned/globally-aligned boundary)

#### Progressive Analysis

**Level 1: ISBN Summary Analysis**
- Fetch book summary/description from APIs
- Quick evaluation based on metadata and publisher summary
- Cost-effective first pass

**Level 2: PDF Theological Summary**
- If user uploads PDF, AI generates comprehensive theological summary
- Analyzes: Major themes, doctrinal positions, scripture usage, worldview

**Level 3: Full Text Deep Analysis**
- Triggered when Level 2 score falls in borderline ranges (67-73%, 87-93%)
- Complete book analysis for precision
- Most expensive, only when necessary for accuracy

#### Evaluation Framework

**Primary Score: Biblical Alignment (determines thresholds)**
- Based on Sola Scriptura - Does this book agree with Scripture itself?
- Non-denominational baseline - The Bible stands on its own
- Range: 0-100%

**Scoring Standard for Controversial Topics:**
- Core doctrines (deity of Christ, resurrection, salvation): Strict biblical adherence required
- Non-core doctrines (eschatology, baptism mode, spiritual gifts): Lenient if biblically grounded
- Principle: If the book makes solid biblical arguments, even on debated topics, it can score ≥90%

**Genre-Specific Evaluation:**

*Non-Fiction (Theology, Devotional, Study):*
- Doctrinal precision matters
- Scripture usage and accuracy
- Theological soundness

*Fiction (Novels, Allegory):*
- Evaluated on themes/values, not doctrinal precision of creative elements
- Questions: Are spiritual lessons biblical? Does worldview align with Scripture? Does it draw readers toward truth?
- Tagged as "Fiction" for context
- Examples: Frank Peretti, C.S. Lewis Chronicles of Narnia, Ted Dekker

**Secondary Information: Theological Context (does NOT affect score)**
- Denominational perspective tags: Reformed, Arminian, Catholic, Orthodox, Charismatic, Baptist, etc.
- Doctrinal category ratings: Soteriology, Ecclesiology, Eschatology, Pneumatology, Christology
- Helps counselors understand theological lens without penalizing faithful biblical interpretation

**Mature Content Detection:**
- AI tags books containing:
  - Sexual content (even if biblical like Song of Solomon)
  - Violence/trauma (abuse recovery, persecution, graphic biblical accounts)
- Does NOT include: Theological complexity
- Tagged for age-gating, does NOT affect alignment score

#### Evaluation Storage

**Complete Analysis Report includes:**
1. Overall Biblical Alignment Score (0-100%)
2. Evaluation version number (for re-evaluation tracking)
3. Theological summary (2-3 paragraphs)
4. Per-doctrine scores and analysis
5. Denominational perspective tags
6. Genre tag (Fiction, Non-Fiction, Devotional, Study, etc.)
7. Mature content flag and reasoning
8. Scripture comparison notes
9. Theological strengths list
10. Theological concerns/cautions list (if any)
11. Reasoning for score
12. Analysis level used (ISBN summary, PDF summary, Full text)
13. AI model used (Sonnet, Opus)
14. Timestamp and evaluation version

### Visibility Tiers

#### Tier 1: Not Aligned (<70%)
- **Visibility:** Hidden from all users
- **Storage:** Kept in database to prevent re-evaluation
- **Notification:** Submitter receives email with summary + 7-day link to full analysis report
- **Re-evaluation:** Only when algorithm version updates globally
- **Purpose:** Prevent wasting AI resources on repeat submissions while giving submitter feedback

#### Tier 2: Conceptually Aligned (70-89%)
- **Visibility:** Organization-only (submitting org and any endorsing orgs)
- **Purpose:** Books with biblical themes but denominational specifics, partial alignment, or org-specific value
- **Sharing:** Members of endorsing organizations can view, recommend, and access
- **PDF Access:** If uploaded and license permits, available to org members only

#### Tier 3: Globally Aligned (≥90%)
- **Visibility:** All platform users
- **Purpose:** Solidly biblical resources valuable across denominations
- **Sharing:** Recommended by AI to any user, appears in global resource search
- **PDF Access:** If uploaded and license permits, available to all users
- **AI Reference:** Books ≥90% become reference material AI can quote/reference during counseling

#### Mature Content Age-Gating

Regardless of alignment tier, books tagged "Mature Content" are filtered by account type:

**Account Type Determination (Priority Order):**

1. **Organization explicitly sets type** - Org admin assigns Child/Teen/Adult when creating subscription
2. **Auto-categorize from birthday** - If birthday provided and org hasn't explicitly set type:
   - Age <13: Child
   - Age 13-17: Teen
   - Age 18+: Adult
3. **Default to Child** - If no birthday AND no org-set type: Default to Child (most restrictive)

**Account Types:**
- **Child** (<13 years old)
- **Teen** (13-17 years old)
- **Adult** (18+ years old)

**Organization Mature Content Settings:**
- Organization sets minimum account type threshold for mature content visibility
- **Default: Teen** - Teen and Adult accounts can view mature content
- **Override options:**
  - Adult Only - Only Adult accounts can view mature content
  - Teen+ (default) - Teen and Adult accounts can view mature content
  - All Ages - Child, Teen, and Adult can view (rarely used)
- Setting applies to all org members regardless of individual preferences
- Tooltip in settings: "Some biblically-aligned books contain mature themes (sexuality, violence, deep theological topics). Choose which account types can access this content. Default: Teen (13+) and Adult accounts can view mature content."

**Individual Users (No Organization):**
- Birth date optional at registration
- If provided: Auto-categorize by age (Child/Teen/Adult)
- If not provided: Default to Child (most restrictive)
- Mature content visible to Teen and Adult types (matches platform default)

**Rationale:** If a young person seeks this content, better they find biblically-grounded information than secular alternatives.

### PDF Storage Strategy

**Two-Tier Storage:**

**Active Storage (≥90% aligned):**
- Fast-access storage (S3 Standard or equivalent)
- Used for AI reference during counseling sessions
- AI can quote passages, reference specific content
- Enables "I see in *Mere Christianity* chapter 3, Lewis says..."

**Archived Storage (<90% aligned):**
- Cold storage (S3 Glacier, Azure Archive, or equivalent)
- Preserved for re-evaluation when algorithm updates
- Retrieved only when global re-evaluation triggered
- Cost-optimized for long-term retention

**Copyright/License Handling:**

When uploading PDF, user selects license type:
1. **Public Domain** - Published pre-1928, automatically shareable
2. **Creative Commons** - Specify CC license type
3. **Publisher Permission** - User confirms they have permission to share
4. **Analysis-Only** (default) - Used for evaluation only, not shared with users

Auto-detection: System checks publication date, auto-selects "Public Domain" if pre-1928.

Conservative default: If license unclear, PDF used for analysis only.

### Organization Endorsements

**How Endorsements Work:**
1. Organization A adds book, AI evaluates at 92%
2. Organization B attempts to add same book
3. System detects duplicate (ISBN or fuzzy match)
4. System displays: "This book already exists with 92% alignment"
5. Organization B is added as endorser
6. Both organizations can view/recommend the book

**Endorsement Display:**
- Summary view: "Recommended by 12 organizations"
- Detail view: Hover/click shows full list of organization names
- Transparency: Organization names publicly visible
- No re-evaluation: Score remains from first submission

### Re-Evaluation System

**Triggers for Global Re-Evaluation:**
- Algorithm version update
- Evaluation framework changes
- AI model improvements
- Admin-initiated (rare)

**Re-Evaluation Process:**
1. Platform admin updates algorithm version
2. System queues all books for re-evaluation
3. Batch processing (oldest first or lowest scores first)
4. Uses same analysis level as original (if PDF available, use it)
5. Version history preserved

**Version Tracking:**
- Each book maintains evaluation history
- Display: "Evaluated v2.1: 92% (was 88% in v1.0)"
- Email notifications sent to endorsing organizations:
  - "Your endorsed book *Title* was re-evaluated: 88% → 92%"
  - Include change summary and link to updated analysis

**Individual Re-Evaluation:**
- Platform admins can trigger single-book re-evaluation for technical issues
- Does NOT allow score manipulation
- Logged with reason in audit trail

### Platform Admin Capabilities

**Minimal Override Approach:**

**Allowed:**
1. **View all books** - Including <70% locked books, see submitting organizations
2. **Trigger re-evaluation** - Individual books for technical issues or global for algorithm updates
3. **View audit trail** - All book submissions, evaluations, and organizational endorsements
4. **Manage evaluation algorithm** - Update version, adjust framework

**Not Allowed:**
1. ~~Manual score override~~ - Prevents gaming, maintains integrity
2. ~~Delete books~~ - All books preserved for deduplication (even <70%)
3. ~~Change visibility tiers~~ - Algorithm determines visibility, not humans

**Rationale:** Minimal human control maintains trust in the system and prevents theological bias injection.

### Async Processing & Notifications

**Book Submission Flow:**
1. User submits book (ISBN/URL or manual)
2. System creates book record with status: "Pending Evaluation"
3. User sees: "Your book has been submitted for evaluation. You'll receive an email when complete (typically 5-15 minutes)."
4. Background job processes evaluation
5. Email sent when complete

**Email Notifications:**

**For books ≥70%:**
- Subject: "Your book *[Title]* scored [Score]% and is [visibility level]"
- Body: Summary report
  - Overall score and visibility tier
  - Key theological tags (3-5 tags)
  - 2-3 sentence summary
  - Mature content flag (if applicable)
  - Link to view full analysis in system
  - Next steps: "Share with your team", "Upload PDF for deeper analysis", etc.

**For books <70%:**
- Subject: "Your book *[Title]* scored [Score]% and is not biblically aligned"
- Body: Summary report + 7-day temporary link to full analysis
- Reasoning: Book won't be accessible in system, but submitter deserves to understand why
- Link expires in 7 days for privacy/security

---

## Organization Recommendation System

### Internal Platform Organizations

**Organization Profiles:**
- Organizations must register with physical address (for regional matching)
- Organizations specify their specialties via tags:
  - Grief Support
  - Addiction Recovery
  - Abuse Recovery
  - Marriage Counseling
  - Financial Counseling
  - Youth Ministry
  - Family Ministry
  - etc.

**Organization Types:**
- Multi-tag system: Organization can be multiple types simultaneously
  - Church
  - Counseling Center
  - Ministry
  - Support Group
- Example: "Church" + "Counseling" + "Grief Support"
- Church tag triggers green styling in recommendations

**Discovery:**
- Organizations list specialties in their profile
- Other orgs can discover and recommend them
- No opt-in required (directory-based model)

### External Organization Referrals

**Data Structure:**

When org admin adds external resource, they provide:
- Name (required)
- Type tags (required): Church, Support Group, Counseling Center, Crisis Hotline, etc.
- Address/Region (required)
- Contact info (required): Phone, Email
- Website (optional but recommended)
- Recommendation note (required): "Why we recommend this resource" - personal endorsement

**Management Location:**
- Org Admin → Resources → Recommended Organizations
- External resources inherit recommending org's region

### Location-Based Matching

**User Location Detection:**
1. When AI identifies need for org referral during counseling
2. AI asks: "What's your general area or ZIP code?"
3. Default to detected location if available (IP geolocation)
4. Match user location to organization addresses
5. Prioritize: Same city → Same region → Same state → Virtual options

**Virtual Support:**
- Organizations can tag as "Virtual Services Available"
- Shown to all users regardless of location
- Prioritized for users who prefer remote support

### Organization Recommendations in Counseling

**Display Format:**

Same pattern as books:
1. **Scripture-based answer** - Biblical guidance first
2. **Inline mentions** (when contextually appropriate) - "Reaching out to a local grief support group like [Grace Church] could provide community during this time"
3. **Rich organization cards** - After the answer, if relevant:
   - Organization name with green styling if Church
   - Type tags (Church, Grief Support, etc.)
   - Contact info (phone, email, website)
   - Map link to address
   - Hours/availability if provided
   - Recommendation note (why this org)
   - Distance from user's location

**When Organizations Are Recommended:**
- Crisis situations (suicide risk, abuse, severe addiction)
- Grief and loss support
- Need for in-person community/fellowship
- Specialized support beyond AI counseling scope
- Long-term accountability needs

---

## User Experience Flows

### Flow 1: Organization Admin Adds Book via ISBN

1. Admin navigates to Org Admin → Resources → Books
2. Clicks "Add New Book"
3. Pastes ISBN: "978-0060652920" (Mere Christianity)
4. System looks up book via Christian bookstore APIs → Google Books → Amazon
5. Displays auto-populated form:
   - Title: "Mere Christianity"
   - Author: "C.S. Lewis"
   - Publisher: "HarperOne"
   - Cover image loaded
   - Description filled
6. Optional fields:
   - Purchase link (pre-filled from API)
   - Upload PDF (optional)
   - If PDF uploaded: Select license type (defaults to "Analysis-Only")
7. Clicks "Submit for Evaluation"
8. Sees: "Your book has been submitted for theological evaluation. You'll receive an email when complete (typically 5-15 minutes)."
9. Background job starts:
   - AI analyzes ISBN summary (Sonnet)
   - Score: 94% (Global)
   - No PDF uploaded, so summary-level analysis
10. Email arrives 8 minutes later:
    - Subject: "Your book Mere Christianity scored 94% and is globally available"
    - Summary report with key tags, visibility tier, link to full analysis
11. Admin clicks link to view full analysis report in system
12. Book now appears in:
    - Organization's endorsed books list
    - Global resource catalog
    - Available for AI recommendations in counseling

### Flow 2: Counselor Uploads PDF for Deeper Analysis

1. Counselor navigates to User Menu → Resources
2. Searches for existing book: "The Bondage of the Will - Martin Luther"
3. Finds it already exists at 88% (Conceptually Aligned, org-only)
4. Clicks book, sees "Upload PDF for deeper analysis"
5. Uploads PDF, selects license: "Public Domain" (published 1525)
6. System queues re-evaluation with PDF
7. Background job:
   - AI generates theological summary from full text (Sonnet)
   - Score still 88% - within borderline range (87-93%)
   - Escalates to Opus for full-text deep analysis
   - Final score: 91% (crosses to Global!)
8. Email notification:
   - "Your book The Bondage of the Will was re-evaluated: 88% → 91% and is now globally available"
9. Book visibility upgraded to global
10. PDF moved to Active Storage (≥90%)
11. AI can now quote from this book during counseling sessions

### Flow 3: User Receives Book Recommendation in Counseling

1. User in counseling session discusses anxiety about future
2. User shares concern about trusting God's plan
3. AI responds:
   ```
   Scripture addresses this directly in Philippians 4:6-7: "Do not be anxious about anything,
   but in every situation, by prayer and petition, with thanksgiving, present your requests to God.
   And the peace of God, which transcends all understanding, will guard your hearts and your minds
   in Christ Jesus."

   God calls us to bring our anxieties to Him in prayer, trusting that His peace—which surpasses
   human understanding—will guard our hearts. This isn't denying legitimate concerns but reframing
   them in light of God's sovereignty and care.

   Reading *The Problem of Pain* by C.S. Lewis might help explore how God's goodness and our
   suffering coexist [expandable card on hover].
   ```

   Below response, rich book card appears:
   - Cover image of "The Problem of Pain"
   - Author: C.S. Lewis
   - Alignment: 93% (Globally Aligned)
   - Tags: Suffering, Theodicy, Christian Apologetics
   - 1-sentence description
   - Buttons: "Save to Reading List", "View Details", "Purchase"

4. User clicks "Save to Reading List"
5. Modal appears: "Set reading status?"
   - [ ] Want to Read
   - [ ] Currently Reading
   - [ ] Finished
6. User selects "Want to Read"
7. Book saved to personal reading list
8. Conversation continues
9. Later, user views conversation in Journal:
   - Full conversation preserved exactly as it appeared
   - Book mention inline with expandable card still functional
   - Can interact: Change status, add notes, view full analysis

### Flow 4: User Browses Resources Menu

1. User clicks User Menu → Resources
2. Lands on Resources page with tabs:
   - My Reading List
   - Browse Books
   - Browse Organizations
   - Recommended for Me (AI-powered)
3. Clicks "Browse Books"
4. Search bar with filters:
   - Text search (title/author)
   - Alignment level: Global (≥90%), Conceptually Aligned (70-89%)
   - Genre: Fiction, Non-Fiction, Devotional, Study, etc.
   - Doctrine tags: Soteriology, Ecclesiology, etc.
   - Denominational perspective: Reformed, Arminian, etc.
   - Mature content: Show/Hide
5. User searches: "grief"
6. Results show books sorted by alignment score:
   - Each card shows: Cover, Title, Author, Score, Tags, Endorsement count
7. User clicks book for details:
   - Full analysis report
   - Theological summary
   - Per-doctrine scores
   - Denominational tags
   - Recommended by: [12 organizations] (hover shows names)
   - Purchase links
   - PDF download (if available and licensed)
   - Action buttons: Save to List, Share
8. User clicks "Recommended for Me" tab:
   - AI-powered: "Based on your reading list and recent counseling topics..."
   - Shows personalized book recommendations
   - Natural language search: "I need resources for a teen struggling with anxiety"
   - AI suggests relevant books with explanations

### Flow 5: Organization Admin Adds External Referral Resource

1. Org Admin navigates to Org Admin → Resources → Recommended Organizations
2. Clicks "Add External Organization"
3. Form appears:
   - Name: "Grace Recovery Center"
   - Type tags: [Counseling Center] [Addiction Recovery] [Grief Support]
   - Address: "123 Main St, Atlanta, GA 30303"
   - Phone: "404-555-1234"
   - Email: "info@gracerecovery.org"
   - Website: "https://gracerecovery.org"
   - Recommendation note: "We've partnered with Grace Recovery for 5 years. Their 12-step program is Christ-centered and highly effective. Staff includes licensed counselors and pastoral care."
4. Clicks "Save"
5. External org added to organization's recommended resources
6. Appears in counseling when:
   - User in org's region (Atlanta metro)
   - AI detects addiction/recovery need
   - Displayed as rich card with contact info, map link, and recommendation

### Flow 6: AI Recommends Organization During Crisis

1. User in counseling expresses suicidal ideation
2. AI detects crisis, provides immediate response:
   ```
   I'm deeply concerned about what you're sharing. Your life has immeasurable value to God
   (Psalm 139:13-16). Please reach out for immediate help:

   **Crisis Resources:**
   - National Suicide Prevention Lifeline: 988 (call or text)
   - Crisis Text Line: Text HOME to 741741
   ```

   Below, rich organization cards:

   **Grace Church** (green styling - Church tag)
   - Tags: Crisis Support, Counseling
   - 1.2 miles from you
   - Phone: 404-555-5678
   - 24/7 crisis line available
   - "Grace Church offers immediate pastoral care and crisis counseling. We've partnered with them for 3 years."

   **Hope Counseling Center**
   - Tags: Crisis Intervention, Grief Support
   - 3.5 miles from you
   - Phone: 404-555-9012
   - Hours: Mon-Fri 8am-8pm, Sat 9am-5pm
   - "Licensed Christian counselors specializing in crisis intervention."

3. User clicks phone number to call
4. Organization recommendation preserved in journal for future reference

---

## Data Model

### Book Entity

```typescript
interface Book {
  id: string; // UUID
  isbn?: string; // Optional, may not exist for all books
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
  purchaseLinks?: PurchaseLink[]; // Multiple retailer links

  // Evaluation data
  evaluationStatus: 'pending' | 'completed' | 'failed';
  biblicalAlignmentScore?: number; // 0-100
  visibilityTier: 'not_aligned' | 'conceptually_aligned' | 'globally_aligned';
  evaluationVersion: string; // e.g., "2.1.0"
  evaluationHistory: EvaluationRecord[]; // Version history

  // AI Analysis
  theologicalSummary?: string;
  doctrineCategoryScores?: DoctrineCategoryScore[]; // Per-doctrine ratings
  denominationalTags?: string[]; // Reformed, Arminian, etc.
  genreTag: string; // Fiction, Non-Fiction, Devotional, Study, etc.
  matureContent: boolean;
  matureContentReason?: string;

  // Detailed analysis
  scriptureComparisonNotes?: string;
  theologicalStrengths?: string[];
  theologicalConcerns?: string[];
  scoringReasoning?: string;
  analysisLevel: 'isbn_summary' | 'pdf_summary' | 'full_text';
  aiModel: 'sonnet' | 'opus';

  // PDF storage
  pdfStoragePath?: string;
  pdfStorageTier?: 'active' | 'archived';
  pdfLicenseType?: 'public_domain' | 'creative_commons' | 'publisher_permission' | 'analysis_only';
  pdfUploadedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  submittedById: string; // User who first submitted
  submittedByOrganizationId: string; // First org to add it
}

interface EvaluationRecord {
  version: string;
  score: number;
  evaluatedAt: Date;
  changedFrom?: number; // Previous score
  aiModel: 'sonnet' | 'opus';
  analysisLevel: 'isbn_summary' | 'pdf_summary' | 'full_text';
}

interface DoctrineCategoryScore {
  category: string; // Soteriology, Ecclesiology, etc.
  score: number; // 0-100
  notes?: string;
}

interface PurchaseLink {
  retailer: string; // Christianbook, Amazon, Google Books, etc.
  url: string;
  isPrimary: boolean; // Featured link
}
```

### BookEndorsement Entity

```typescript
interface BookEndorsement {
  id: string;
  bookId: string;
  organizationId: string;
  endorsedAt: Date;
  endorsedById: string; // User who added it for this org
}
```

### Organization Entity (Updated)

```typescript
interface Organization {
  // ... existing fields ...

  // New fields for resource system
  address: string; // Required for regional matching
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: { lat: number; lng: number }; // Geocoded

  // Specialties
  specialtyTags: string[]; // Grief, Addiction, Abuse, Marriage, Youth, etc.
  organizationTypes: string[]; // Church, Counseling, Ministry, Support Group

  // Virtual support
  offersVirtualServices: boolean;

  // Mature content settings
  matureContentAccountTypeThreshold: 'child' | 'teen' | 'adult'; // Default: 'teen' (Teen+ can view mature content)
}
```

### ExternalOrganization Entity

```typescript
interface ExternalOrganization {
  id: string;
  name: string;
  organizationTypes: string[]; // Church, Counseling Center, Support Group, etc.
  specialtyTags: string[]; // Grief, Addiction, Abuse, etc.

  // Location
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: { lat: number; lng: number };

  // Contact
  phone?: string;
  email?: string;
  website?: string;
  hours?: string;

  // Recommendation
  recommendedByOrganizationId: string; // Org that added this
  recommendationNote: string; // Why we recommend them

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  addedById: string; // User who added this
}
```

### User Entity (Updated)

```typescript
interface User {
  // ... existing fields ...

  // New fields for resource system
  birthDate?: Date; // Optional for age-gating
  accountType?: 'child' | 'teen' | 'adult'; // For org-managed subscriptions

  // Location (optional, for org recommendations)
  city?: string;
  state?: string;
  zipCode?: string;
}
```

### UserReadingList Entity

```typescript
interface UserReadingList {
  id: string;
  userId: string;
  bookId: string;

  // Status tracking
  status: 'want_to_read' | 'currently_reading' | 'finished';
  progress?: number; // Percentage for currently_reading

  // Notes and review
  personalNotes?: string;
  personalRating?: number; // 1-5 stars
  dateStarted?: Date;
  dateFinished?: Date;

  // Metadata
  addedAt: Date;
  updatedAt: Date;
}
```

### ConversationResourceMention Entity

```typescript
interface ConversationResourceMention {
  id: string;
  conversationId: string;
  messageId: string; // Specific message in conversation

  // Resource reference
  resourceType: 'book' | 'organization';
  resourceId: string; // bookId or organizationId (internal or external)

  // Context
  mentionedAt: Date;
  contextSnippet?: string; // Surrounding text for context
}
```

---

## Technical Implementation Notes

### Book Lookup Services

**Priority Order:**
1. **Christianbook.com API** - Faith-based, good metadata
2. **Google Books API** - Free, comprehensive, good fallback
3. **Amazon Product Advertising API** - Requires affiliate account, rich data
4. **Manual Entry** - Always available fallback

**Implementation:**
- Try each service sequentially with timeout (5 seconds per service)
- First successful lookup populates form
- Cache successful lookups (1 week) to reduce API calls

### AI Evaluation Prompts

**Evaluation Prompt Structure:**

```
You are a theological evaluator assessing Christian books for biblical alignment.

BOOK INFORMATION:
Title: [title]
Author: [author]
Genre: [genre]
Description: [description or full text]

EVALUATION CRITERIA:
1. Biblical Alignment Score (0-100%): Does this book agree with Scripture itself (Sola Scriptura)?
   - Core doctrines (deity of Christ, resurrection, salvation): Strict adherence required
   - Non-core doctrines (eschatology, baptism, spiritual gifts): Lenient if biblically grounded
   - Fiction: Evaluate themes/values, not doctrinal precision of creative elements

2. Theological Analysis:
   - Summarize the book's theological positions
   - Identify per-doctrine alignment (Soteriology, Ecclesiology, Eschatology, Pneumatology, Christology)
   - Tag denominational perspective (Reformed, Arminian, Catholic, Orthodox, etc.) - informational only
   - Note theological strengths and any concerns

3. Mature Content Detection:
   - Flag if contains sexual content or violence/trauma themes
   - Does NOT include theological complexity

OUTPUT FORMAT:
{
  "biblicalAlignmentScore": 0-100,
  "theologicalSummary": "2-3 paragraph summary",
  "doctrineCategoryScores": [
    { "category": "Soteriology", "score": 0-100, "notes": "..." },
    ...
  ],
  "denominationalTags": ["Reformed", "Evangelical"],
  "matureContent": true/false,
  "matureContentReason": "Contains explicit discussion of sexuality/violence",
  "scriptureComparisonNotes": "...",
  "theologicalStrengths": ["...", "..."],
  "theologicalConcerns": ["...", "..."],
  "scoringReasoning": "Detailed explanation of score"
}
```

### Background Job Processing

**Job Queue:**
- Use existing job queue system (Bull, BullMQ, or similar)
- Priority levels:
  1. High: Borderline re-evaluations (Opus)
  2. Normal: Initial evaluations (Sonnet)
  3. Low: Global re-evaluation batches

**Concurrency:**
- Limit concurrent evaluations to control AI API costs
- Recommended: 5 concurrent Sonnet, 2 concurrent Opus

**Error Handling:**
- Retry failed evaluations 3 times with exponential backoff
- If still failing, mark as 'failed' and notify submitter
- Log failures for admin review

### File Storage

**Active Storage (≥90%):**
- AWS S3 Standard / Azure Blob Hot / Google Cloud Storage Standard
- Enable CDN for fast global access
- Organize: `/active/books/{bookId}.pdf`

**Archived Storage (<90%):**
- AWS S3 Glacier / Azure Blob Archive / Google Cloud Storage Archive
- Much cheaper for long-term retention
- Retrieval time: Hours (acceptable for re-evaluation scenarios)
- Organize: `/archived/books/{bookId}.pdf`

**Migration:**
- When book score changes from <90% to ≥90%: Move Archived → Active
- When book score changes from ≥90% to <90%: Move Active → Archived
- Async job handles migrations

### Age-Gating Implementation

**Client-Side:**
- Calculate user age from birthDate on frontend
- Filter mature content books client-side for performance
- Show/hide based on org's threshold setting

**Server-Side:**
- Enforce age-gating in API endpoints
- Return 403 if user under threshold attempts to access mature book
- Audit log for compliance

### Search & Discovery

**Book Search:**
- Elasticsearch or PostgreSQL full-text search
- Index: Title, Author, Description, Theological Summary, Tags
- Faceted search: Alignment tier, Genre, Denominational tags, Mature content

**AI-Powered Recommendations:**
- Endpoint: `/api/resources/books/recommend`
- Input: Natural language query + user context (reading list, recent conversations)
- AI generates book recommendations with explanations
- Returns: Book IDs + reasoning for each recommendation

---

## UI/UX Design

### Resources Menu Structure

**User Menu → Resources:**
1. **My Reading List** - Personal library with status tracking
2. **Browse Books** - Search and filter all accessible books
3. **Browse Organizations** - Search support organizations by location/specialty
4. **Recommended for Me** - AI-powered personalized suggestions

### Org Admin Resources Section

**Org Admin → Resources:**
1. **Books**
   - Our Endorsed Books (list with filters)
   - Add New Book (ISBN/URL or manual)
   - Pending Evaluations (status tracking)
   - Usage Analytics (how many times recommended, by which counselors)
2. **Organizations**
   - Internal Platform Organizations (discover and endorse)
   - External Referrals (add local churches, support groups)
   - Usage Analytics (how often recommended)

### Platform Admin Resources Section

**Platform Admin → Resources:**
1. **All Books**
   - View all books including <70% locked
   - Filter by status, score, endorsement count
   - Trigger individual re-evaluation
   - View audit trail
2. **Evaluation Management**
   - Current algorithm version
   - Update evaluation framework (triggers global re-evaluation)
   - View evaluation queue and progress
   - Cost analytics (AI spending per evaluation)
3. **Organizations**
   - View all internal and external organizations
   - Analytics on recommendation frequency

### Book Detail Page

**Layout:**

**Left Column (60%):**
- Cover image (large)
- Title, Author, Publisher, Year
- Purchase links (buttons for each retailer)
- PDF download button (if available and licensed)
- "Recommended by X organizations" (click to expand list)

**Right Column (40%):**
- Biblical Alignment Score (large, color-coded)
  - <70%: Red "Not Aligned"
  - 70-89%: Yellow "Conceptually Aligned"
  - ≥90%: Green "Globally Aligned"
- Visibility tier explanation
- Tags: Genre, Denominational perspective, Mature content flag
- Action buttons:
  - Save to Reading List (with status dropdown)
  - Share with others
  - Report issue (rare)

**Tabs Below:**
1. **Summary** - Theological summary (2-3 paragraphs)
2. **Detailed Analysis** - Per-doctrine scores, strengths, concerns, reasoning
3. **Endorsements** - List of organizations, why they recommend it
4. **Evaluation History** - Version history with score changes

### Reading List Page

**Tabs:**
1. **Want to Read** - Books saved for later
2. **Currently Reading** - Active reads with progress tracking
3. **Finished** - Completed books with dates and notes

**Each Book Card:**
- Cover thumbnail
- Title, Author
- Status with progress bar (for currently reading)
- Personal notes snippet
- Quick actions: Update status, Add notes, Remove

**AI Integration Note:**
- Banner at top: "Your reading list is visible to the AI during counseling sessions for personalized guidance."

### Organization Card (in recommendations)

**Visual Design:**
- Church tag: Green border and green "Church" badge
- Other types: Blue border

**Content:**
- Organization name (bold, large)
- Type tags (badges): Church, Grief Support, Counseling, etc.
- Distance from user: "1.2 miles from you" or "Virtual services available"
- Contact info: Phone (clickable), Email (clickable), Website (link)
- Hours: "Mon-Fri 8am-8pm, 24/7 crisis line available"
- Map link: "View on map" (opens Google Maps)
- Recommendation: "Why we recommend: [note from org admin]"

---

## Success Metrics

### Phase 1 (MVP) - 3 Months Post-Launch

**Adoption:**
- 20+ organizations have added books
- 100+ books in catalog
- 50+ books evaluated at ≥90% (globally aligned)
- 200+ book endorsements across organizations

**Engagement:**
- 30% of users have saved at least one book to reading list
- 10% of counseling sessions include book recommendations
- 500+ books recommended across all sessions

**Quality:**
- <5% of evaluations require manual re-evaluation
- <10% of books score <70% (not aligned)
- 0 complaints about inappropriate content reaching users

### Phase 2 (Growth) - 6 Months Post-Launch

**Adoption:**
- 50+ organizations active
- 500+ books in catalog
- 50+ external organizations added as referrals
- Each org has added average 3+ external referrals

**Engagement:**
- 50% of users have reading lists
- 25% of sessions include book recommendations
- 15% of sessions include organization recommendations
- 1000+ books in users' "finished" status with notes

**Quality:**
- AI evaluation accuracy validated by theological experts
- User satisfaction: 4.5+ stars for book recommendations
- 0 copyright/licensing issues

### Phase 3 (Maturity) - 12 Months Post-Launch

**Adoption:**
- 100+ organizations
- 2000+ books
- Books available in 10+ languages (future enhancement)
- Regional coverage: All 50 US states

**Engagement:**
- 70% of users have reading lists
- 40% of sessions include resource recommendations
- Reading list completion rate: 30% (users finishing books they start tracking)
- AI quoting from ≥90% books in 20% of sessions

**Business Impact:**
- Increased user retention (resources keep users engaged between sessions)
- Increased session depth (resources enable follow-up conversations)
- Positive testimonials mentioning resources
- Organizations citing resource library as key differentiator

---

## Implementation Phases

### Phase 1: Core Book Management (MVP)

**Week 1-2: Database & Backend Foundation**
- Prisma schema updates (Book, BookEndorsement, UserReadingList entities)
- Book lookup service (API integrations for ISBN/URL)
- Duplicate detection (ISBN + fuzzy matching)
- Storage service (S3/equivalent setup for Active/Archived)

**Week 3-4: AI Evaluation System**
- AI evaluation service (Claude integration)
- Progressive analysis (ISBN summary → PDF summary → Full text)
- Cascading model logic (Sonnet → Opus for borderline)
- Background job processing
- Email notification service

**Week 5-6: Book Management UI**
- Org Admin → Resources → Books section
- Add book form (ISBN/URL or manual)
- Book detail page with full analysis
- Endorsement display
- PDF upload and license selection

**Week 7-8: Reading List & Browse**
- User Menu → Resources section
- Browse books (search, filters)
- Book detail page for users
- Personal reading list (CRUD operations)
- Status tracking UI

**Week 9-10: Counseling Integration**
- AI prompt updates (book recommendation logic)
- Book mention parsing and storage
- Inline + rich card display in counseling UI
- Journal integration (preserve book mentions)
- Save to reading list from conversation

**Week 11-12: Testing & Polish**
- End-to-end testing (add book → evaluate → recommend → save)
- Age-gating implementation
- Mature content filtering
- Copyright/licensing enforcement
- Performance optimization (caching, CDN)
- Launch preparation

### Phase 2: Organization Recommendations

**Week 13-14: Data Model & Backend**
- ExternalOrganization entity
- Organization profile updates (address, specialties, types)
- Location-based matching service
- Geocoding integration

**Week 15-16: Org Management UI**
- Org Admin → Resources → Organizations section
- Add external organization form
- Browse internal organizations (discovery)
- Tag and specialty management

**Week 17-18: Counseling Integration**
- AI prompt updates (org recommendation logic)
- Location detection and matching
- Rich organization cards in counseling UI
- Church (green) styling
- Journal preservation

**Week 19-20: Testing & Refinement**
- Location-based testing (multiple regions)
- Crisis scenario testing
- External org data quality
- Launch

### Phase 3: Advanced Features

**Week 21-24: Enhanced Discovery**
- AI-powered book search ("I need resources for...")
- Personalized recommendations based on reading list + counseling history
- Organization analytics (usage tracking)
- Book usage analytics (recommendation frequency)

**Week 25-28: Reading Experience**
- Progress tracking enhancements
- Book notes and personal reviews
- Reading goals and streaks
- Social features (share books with counselor/org members)

**Week 29-32: Platform Features**
- Multi-language support for books
- Audio book integration
- Study guides and discussion questions
- Group reading features (org-wide book studies)

---

## Security & Privacy Considerations

### Data Protection

**Personal Reading Lists:**
- Private by default
- Only shared with AI during user's own counseling sessions
- Never shared with other users or organizations without explicit consent
- GDPR compliance: Users can export or delete reading list data

**Book PDFs:**
- Access control based on alignment tier + age-gating
- Copyright/license enforcement
- Audit logging for PDF access (compliance)
- DRM considerations for publisher-licensed content (future)

**User Location:**
- Optional, requested only when needed for org recommendations
- Not stored permanently (session-only)
- IP geolocation fallback is coarse (city-level)
- Users can opt out of location-based features

### Content Moderation

**Theological Integrity:**
- AI evaluation is primary gatekeeper
- No manual score override prevents bias injection
- Platform admins can view but not manipulate
- Algorithm updates are versioned and auditable

**Age-Appropriateness:**
- Conservative defaults (assume underage if birth date not provided)
- Organization-level control for subscriptions
- Audit trail for compliance
- Parental notification for org-managed child/teen accounts

**Copyright Protection:**
- Conservative licensing defaults
- Public domain auto-detection
- Clear labeling of license types
- DMCA compliance process for takedown requests

### Abuse Prevention

**Gaming the System:**
- No manual score override (prevents manipulation)
- Duplicate detection prevents score shopping
- All evaluations logged with submitter info
- Anomaly detection for suspicious patterns (e.g., one org submitting 100 books in a day)

**Spam/Inappropriate Content:**
- AI evaluation catches obviously problematic content (<70% rejection)
- 7-day temporary link for rejected books (submitter can review, but not public)
- Report mechanism on book detail pages
- Admin review queue for flagged content

---

## Future Enhancements (Beyond Phase 3)

### Multi-Language Support
- Books in Spanish, Chinese, Korean, etc.
- AI evaluation in multiple languages
- Denominational tags relevant to global Christianity

### Audio Books & Podcasts
- Integrate audio book platforms (Audible, Christian Audio)
- Podcast recommendations with episode-level granularity
- Transcript analysis for theological evaluation

### Study Resources
- Bible study guides
- Sermon series
- Video courses (RightNow Media, Bible Project, etc.)

### Community Features
- Group reading challenges (org-wide or platform-wide)
- Discussion forums for books
- User-generated reviews and ratings (moderated)
- Counselor-curated reading plans

### Publisher Partnerships
- Direct integration with Christian publishers
- Exclusive pre-release access for highly aligned books
- Bulk purchasing discounts for organizations
- Revenue sharing on book sales

### Advanced AI Features
- AI-generated study questions per book
- AI-facilitated book discussions
- Personalized reading plans based on spiritual growth goals
- AI summarization of key takeaways

---

## Open Questions & Decisions Needed

### Technical Decisions

1. **Geocoding Service:** Which provider? (Google Maps, Mapbox, OpenCage)
2. **Job Queue:** Bull/BullMQ or existing queue system?
3. **Search Engine:** Elasticsearch, PostgreSQL full-text, or Algolia?
4. **CDN Provider:** CloudFront, Cloudflare, or Fastly?

### Business Decisions

1. **Book Purchase Affiliate Links:** Should we earn commission on book sales? (Ethical considerations for ministry)
2. **API Rate Limits:** How many book lookups/evaluations per org per day?
3. **Storage Costs:** Budget for Active vs Archived storage? (Estimate: $500/month for 10,000 books)
4. **Publisher Partnerships:** Reach out to Christian publishers early? (Zondervan, HarperOne, NavPress, etc.)

### Policy Decisions

1. **Copyright Enforcement:** Who verifies publisher permission claims?
2. **DMCA Process:** How quickly must we respond to takedown requests?
3. **Theological Disputes:** If an org disputes a book's score, what's the escalation process?
4. **Age-Gating Legal:** Do we need parental consent for users 13-17? (COPPA compliance)

---

## Appendix: Example Books & Expected Scores

### Expected ≥90% (Globally Aligned)

- *Mere Christianity* - C.S. Lewis
- *The Problem of Pain* - C.S. Lewis
- *The Screwtape Letters* - C.S. Lewis (Fiction, Mature: Demonic perspective)
- *The Cost of Discipleship* - Dietrich Bonhoeffer
- *The Pursuit of God* - A.W. Tozer
- *Knowing God* - J.I. Packer
- *The Gospel According to Jesus* - John MacArthur
- *Desiring God* - John Piper
- *The Holiness of God* - R.C. Sproul
- *This Present Darkness* - Frank Peretti (Fiction)

### Expected 70-89% (Conceptually Aligned)

- *The Bondage of the Will* - Martin Luther (Strong Reformed soteriology)
- *The Purpose Driven Life* - Rick Warren (Denominationally specific)
- *The Shack* - William P. Young (Fiction, theological liberties)
- *Jesus Calling* - Sarah Young (Subjective revelation claims)
- *The Circle Maker* - Mark Batterson (Prayer methodology debatable)

### Expected <70% (Not Aligned)

- *A New Earth* - Eckhart Tolle (New Age, not Christian)
- *The Gospel of Judas* - (Gnostic, heretical)
- *Love Wins* - Rob Bell (Universalism concerns)
- Books denying core doctrines (Trinity, Resurrection, etc.)

---

**End of Design Document**

*This design is approved and ready for implementation planning.*
