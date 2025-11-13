# MyChristianCounselor - System Design Document

**Date:** November 10, 2025
**Version:** 1.0
**Status:** Approved

---

## Executive Summary

MyChristianCounselor is a cross-platform (web, iOS, Android) AI-powered counseling application that provides Biblical guidance informed by Constitutional principles. The app features an adaptive consultation model where the AI asks clarifying questions before providing tailored, scripture-based guidance for any life question.

**Core Principles:**
- Biblical truth supersedes all other input
- Constitutional principles provide a secondary framework for civic/ethical matters
- Broadly evangelical/non-denominational theological stance
- Comprehensive safety measures for crisis situations
- Privacy-first approach to sensitive conversations

---

## 1. System Architecture & Technology Stack

### 1.1 Monorepo Structure

```
mychrisiancounselor/
├── packages/
│   ├── api/              # Backend API (Node.js/TypeScript)
│   ├── mobile/           # React Native (iOS + Android)
│   ├── web/              # React Web
│   ├── shared/           # Shared business logic, types, utilities
│   └── ai-training/      # Model fine-tuning scripts and data
├── docs/                 # Documentation and design docs
└── infrastructure/       # IaC (Terraform/CDK) for cloud resources
```

### 1.2 Core Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Monorepo** | Nx or Turborepo | Dependency management, build optimization |
| **Backend** | Node.js 20+ with NestJS | TypeScript, modular, scalable architecture |
| **Mobile** | React Native 0.74+ with Expo | Code reuse, faster development, OTA updates |
| **Web** | React 18+ with Next.js | SSR, SEO optimization, performance |
| **Database** | PostgreSQL | Relational data (users, sessions, messages) |
| **Vector DB** | Pinecone or Weaviate | Scripture embeddings for semantic search |
| **Authentication** | Auth0 or Firebase Auth | OAuth, email/password, managed security |
| **AI Infrastructure** | AWS Bedrock or GCP Vertex AI | Fine-tuned model hosting |
| **Hosting** | AWS or GCP | API Gateway, Lambda/ECS, S3, CloudFront |

### 1.3 Architectural Pattern

**Approach:** Monolithic Backend + Cross-Platform Frontend

- Single shared REST/GraphQL API backend
- React Native for iOS + Android (90%+ code sharing)
- React Web sharing components/logic with React Native via monorepo
- TypeScript end-to-end for type safety

---

## 2. AI Agent Design & Fine-Tuning Strategy

### 2.1 AI Agent Architecture

The counseling agent consists of three key components:

#### 2.1.1 Conversation Orchestrator (Backend Service)
- Manages multi-turn conversations
- Determines when to ask clarifying questions vs. provide guidance
- Tracks conversation context and user emotional state
- Routes to appropriate response strategy (brief vs. deep consultation)

#### 2.1.2 Fine-Tuned Base Model
**Training Data Sources:**
- Multiple Bible translations (NIV, ESV, NLT, KJV, NKJV) - public domain texts
- Constitutional texts and historical documents
- Licensed Christian counseling books and resources
- Theological commentaries (broadly evangelical perspective)

**Training Approach:**
- Foundation model (Llama 3, Mistral, or Claude base) fine-tuned on above sources
- Instruction-following fine-tuning for clarifying question generation
- 50K-200K high-quality training examples covering diverse life topics
- Theological review by advisors during dataset preparation

#### 2.1.3 Retrieval-Augmented Generation (RAG) Layer
- Vector database with embedded scripture passages, constitutional text, counseling resources
- Semantic search retrieves relevant passages based on user's question
- Retrieved context injected into model prompts for accurate citations
- Ensures AI cites actual scripture rather than hallucinating verses

### 2.2 Fine-Tuning Data Pipeline

```
Source Materials → Preprocessing → Quality Control → Training Dataset → Fine-Tuning → Evaluation
```

- **Preprocessing:** Clean texts, create Q&A pairs, add instruction templates
- **Quality Control:** Theological review, remove contradictory materials
- **Training Dataset:** 50K-200K examples covering relationships, work, parenting, spiritual growth, ethics
- **Evaluation:** Test on held-out theological questions, measure citation accuracy

### 2.3 Safety Mechanisms

- **Crisis Detection:** Keyword monitoring for suicide, abuse, self-harm triggers immediate resource provision
- **Topic Filters:** Prevent medical diagnosis or severe mental health treatment advice
- **Biblical Precedence:** Bible guides spiritual matters; Constitution applies to civic/legal questions
- **Response Review:** Automated checks for theological accuracy before delivery

---

## 3. Backend API Design

### 3.1 API Architecture

**Pattern:** RESTful API with GraphQL consideration for future optimization

### 3.2 Core API Modules

#### 3.2.1 Authentication & User Management (`/api/auth`, `/api/users`)
- `POST /auth/register` - Create account
- `POST /auth/login` - Email/password or OAuth
- `POST /auth/anonymous-session` - Create temporary session for free tier
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update preferences (Bible translation, notifications)

#### 3.2.2 Counseling Sessions (`/api/sessions`)
- `POST /api/sessions` - Start new counseling session
- `GET /api/sessions` - List user's past sessions (premium only)
- `GET /api/sessions/:id` - Retrieve specific session
- `POST /api/sessions/:id/messages` - Send message in session
- `DELETE /api/sessions/:id` - Delete session (privacy)

#### 3.2.3 AI Counseling Engine (`/api/counsel`)
- `POST /api/counsel/ask` - Submit question, get initial response or clarifying questions
- `POST /api/counsel/respond` - Answer AI's clarifying question
- `WebSocket /api/counsel/stream` - Real-time streaming responses

#### 3.2.4 Resources & Saved Content (`/api/resources`)
- `GET /api/resources/scriptures/:reference` - Fetch scripture passage
- `POST /api/saved` - Save guidance, scripture, or conversation (premium)
- `GET /api/saved` - Retrieve saved items

#### 3.2.5 Subscription & Billing (`/api/billing`)
- `GET /api/billing/plans` - Available subscription tiers
- `POST /api/billing/subscribe` - Start subscription (Stripe integration)
- `GET /api/billing/usage` - Check free tier limits

### 3.3 Data Models

```typescript
User {
  id: string;
  email: string;
  authProvider: 'email' | 'google' | 'apple';
  tier: 'free' | 'premium';
  preferences: {
    bibleTranslation: 'NIV' | 'ESV' | 'NLT' | 'KJV' | 'NKJV';
    notifications: boolean;
  };
  createdAt: Date;
  isAnonymous: boolean;
}

Session {
  id: string;
  userId: string | null;
  title: string; // auto-generated from topic
  messages: Message[];
  status: 'active' | 'completed';
  category: 'relationships' | 'spiritual' | 'work' | 'family' | 'financial' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scriptureReferences: ScriptureReference[];
  constitutionalReferences: ConstitutionalReference[];
  timestamp: Date;
}

ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: string;
  text: string;
}

ConstitutionalReference {
  article?: string;
  amendment?: number;
  section?: string;
  text: string;
}
```

---

## 4. Frontend Design - User Experience

### 4.1 Shared UI Components (`@mycc/shared`)

- Scripture card component (displays verse with reference)
- Conversation message bubbles
- Clarifying question interface
- Crisis resource modal
- Authentication forms
- Subscription/paywall prompts

### 4.2 User Journey Flow

#### 4.2.1 Anonymous/First-Time User
1. Lands on homepage → "Ask a Question" prominent CTA
2. Types question → App explains it will ask clarifying questions
3. AI asks 1-3 adaptive follow-up questions
4. Receives guidance with inline scripture citations (John 3:16)
5. After 3-5 questions (free limit), prompted to create account for deeper features

#### 4.2.2 Registered Free User
- Access to basic Q&A (limited to 20 questions/month)
- Can save up to 10 conversations
- Limited clarifying question depth (max 3 questions)
- Cannot export or share guidance

#### 4.2.3 Premium User
- Unlimited counseling sessions
- Full adaptive consultation (7+ clarifying questions when needed)
- Full conversation history with search
- Save unlimited guidance and scriptures
- Export conversations as PDF
- Future: prayer journal, devotional plans, community features

### 4.3 Key UX Principles

- **Mobile-first design:** Most users engage on phones during moments of need
- **Conversational pacing:** Animated typing indicators, natural pauses
- **Accessibility:** WCAG 2.1 AA compliance, screen reader optimized
- **Offline support:** Cache recent conversations for reading without internet
- **Progressive disclosure:** Introduce features gradually to avoid overwhelming new users

### 4.4 Visual Design Direction

- Clean, calming aesthetic (soft blues, warm neutrals)
- Readable typography (larger font sizes for scripture)
- Minimal distractions during consultation
- Subtle Christian imagery (cross, dove) without being heavy-handed

### 4.5 Mobile App Navigation Structure

```
Home Screen
  → New Question (bottom tab)
      → Question Input
      → Clarifying Questions Flow
      → Guidance Response
      → Save/Share Options

  → My Sessions (bottom tab) [Premium]
      → Session List
      → Session Detail
      → Search Sessions

  → Saved (bottom tab) [Premium]
      → Saved Guidance
      → Saved Scriptures
      → Collections

  → Profile (bottom tab)
      → Settings (Bible translation, notifications)
      → Subscription Management
      → About/Help
```

### 4.6 Web App Structure

- Similar navigation adapted for desktop (sidebar instead of bottom tabs)
- More screen real estate for side-by-side views (conversation + scripture panel)
- SEO-optimized landing pages for organic discovery

---

## 5. Safety, Privacy & Ethical Considerations

### 5.1 Crisis Detection & Response

**Crisis Keywords Monitoring:** Real-time detection of terms like "suicide," "kill myself," "end it all," "abuse," "hurt myself"

**Immediate Response Protocol:**
- Pause normal AI response generation
- Display crisis resources immediately:
  - National Suicide Prevention Lifeline: 988
  - Crisis Text Line: Text HOME to 741741
  - Domestic Violence Hotline: 1-800-799-7233
- Gentle message: "I'm concerned about what you're sharing. Please reach out to these professional resources who can provide immediate help."
- Log anonymized incident for review (never store actual message content)

### 5.2 Topic Boundaries & Disclaimers

- **Medical Advice:** AI explicitly states it cannot diagnose conditions or prescribe treatments; directs to healthcare professionals
- **Legal Advice:** Constitutional context is educational only; directs to qualified attorneys for legal matters
- **Severe Mental Health:** Recognizes limits; recommends licensed Christian counselors for clinical issues (depression, PTSD, addiction requiring treatment)
- **Upfront Disclaimer:** Clear statement on first use: "This is AI-powered spiritual guidance, not professional counseling. For emergencies, contact 911 or crisis services."

### 5.3 Privacy & Data Security

- **Data Encryption:** All conversations encrypted at rest (AES-256) and in transit (TLS 1.3)
- **Minimal Data Collection:** Only collect what's necessary; anonymous users' conversations deleted after session ends
- **GDPR/CCPA Compliance:** Right to deletion, data export, transparency
- **No Third-Party Sharing:** User conversations never shared with advertisers or data brokers
- **Optional Account Deletion:** Users can permanently delete all data with one click

### 5.4 Theological Safeguards

- **Human Review Loop:** Random sample of AI responses reviewed by theological advisors monthly
- **Bias Monitoring:** Track for any denominational drift or heretical outputs
- **Feedback Mechanism:** Users can report concerning responses for immediate review
- **Version Control:** All model updates undergo theological evaluation before deployment

### 5.5 Content Moderation

- Filter out abusive/harassing messages toward the AI
- Block attempts to manipulate AI into providing non-Biblical guidance
- Prevent jailbreaking attempts that bypass safety guidelines

---

## 6. Phased Development & Rollout Strategy

### Phase 1: MVP - Proof of Concept (3-4 months)

**Goal:** Validate core concept with minimal viable feature set

**Scope:**
- Web-only platform (faster iteration, easier testing)
- Anonymous-only access (no authentication complexity yet)
- Basic AI counseling with fixed depth (3 clarifying questions max)
- Single Bible translation (NIV)
- No payment system - completely free
- Basic RAG with scripture database (no fine-tuned model yet - use GPT-4/Claude with custom prompts)
- Essential safety features (crisis detection, disclaimers)

**Success Metrics:**
- 100+ beta users complete at least one session
- 70%+ user satisfaction rating
- Theological review confirms Biblical accuracy
- No major safety incidents

**Why start here:**
- Fastest path to user feedback
- Validates whether guided consultation UX works
- Tests if RAG + prompting is sufficient (may not need fine-tuning)
- Lower cost and complexity

---

### Phase 2: V1 - Full Platform Launch (3-4 months after MVP)

**Goal:** Launch complete cross-platform experience with monetization

**Scope:**
- Add React Native mobile apps (iOS + Android)
- Full authentication system (email + OAuth)
- Free tier (limited) + Premium subscription
- Adaptive consultation depth
- Multiple Bible translations (user-selectable)
- Conversation history and saved resources
- Stripe payment integration
- Enhanced AI: Either fine-tuned model OR improved RAG system based on MVP learnings

**Success Metrics:**
- 1,000+ registered users within first month
- 10%+ conversion rate (free → premium)
- 4.5+ star rating on app stores
- <5% churn rate for premium subscribers

---

### Phase 3: Full Feature Release (6-12 months after V1)

**Goal:** Mature product with advanced features

**Scope:**
- Fully fine-tuned AI model (if not done in V1)
- Advanced features: prayer journal, daily devotionals, scripture memorization tools
- Community features: share guidance (with privacy controls), discussion groups
- Multi-language support (Spanish priority)
- Pastoral dashboard (for churches to offer to members)
- API access for church apps to integrate counseling
- iOS/Android widgets for quick access
- Push notifications for encouragement

---

## 7. Key Technical Implementation Details

### 7.1 Monorepo Setup

```json
// Root package.json scripts
{
  "dev:api": "nx serve api",
  "dev:web": "nx serve web",
  "dev:mobile": "nx run mobile:start",
  "build:all": "nx run-many --target=build --all",
  "test:all": "nx run-many --target=test --all",
  "lint:all": "nx run-many --target=lint --all"
}
```

### 7.2 Shared Package Structure

```typescript
// @mycc/shared/src/types/index.ts
export interface Session {
  id: string;
  userId: string | null;
  title: string;
  messages: Message[];
  status: 'active' | 'completed';
  category: SessionCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  scriptureReferences: ScriptureReference[];
  constitutionalReferences: ConstitutionalReference[];
  timestamp: Date;
}

// @mycc/shared/src/utils/scripture.ts
export class ScriptureParser {
  static parseReference(ref: string): ScriptureReference { }
  static formatReference(ref: ScriptureReference): string { }
}

// @mycc/shared/src/constants/
export const BIBLE_TRANSLATIONS = ['NIV', 'ESV', 'NLT', 'KJV', 'NKJV'];
export const FREE_TIER_LIMITS = {
  questionsPerMonth: 20,
  savedConversations: 10
};
export const CRISIS_KEYWORDS = ['suicide', 'kill myself', ...];
```

### 7.3 Backend Key Services

```typescript
// packages/api/src/modules/counsel/counsel.service.ts
@Injectable()
export class CounselService {
  async processQuestion(
    question: string,
    sessionId: string
  ): Promise<CounselResponse> {
    // 1. Retrieve conversation context
    // 2. Detect crisis keywords
    // 3. Determine if clarifying questions needed
    // 4. Query RAG system for relevant scriptures
    // 5. Call AI model with context + retrieved passages
    // 6. Parse response for scripture citations
    // 7. Store message in database
    // 8. Return formatted response
  }

  async adaptiveConsultation(session: Session): Promise<boolean> {
    // Logic to determine if more clarifying questions needed
    // Based on: complexity, user tier, conversation depth so far
  }
}

// packages/api/src/modules/ai/rag.service.ts
@Injectable()
export class RAGService {
  async retrieveRelevantScriptures(
    query: string,
    limit: number
  ): Promise<ScripturePassage[]> {
    // 1. Generate embedding for user's query
    // 2. Semantic search in vector database
    // 3. Retrieve top-k most relevant passages
    // 4. Include translation preference
    // 5. Return formatted passages with references
  }
}
```

---

## 8. Testing Strategy & Quality Assurance

### 8.1 Testing Pyramid Approach

#### Unit Tests (70% of test coverage)
- All shared utilities (`@mycc/shared`) - scripture parsing, formatting, validation
- Backend services - RAG retrieval, conversation orchestration, safety checks
- Frontend components - message rendering, input validation, navigation
- **Target:** 80%+ code coverage
- **Tools:** Jest, React Testing Library

#### Integration Tests (20% of test coverage)
- API endpoint testing - full request/response cycles
- Database operations - session creation, message storage, user management
- AI service integration - mock model responses, verify RAG retrieval
- Authentication flows - registration, login, session management
- **Tools:** Supertest, Test containers (Docker PostgreSQL)

#### End-to-End Tests (10% of test coverage)
**Critical user journeys:**
- Anonymous user asks question → receives guidance
- User creates account → saves conversation
- Premium upgrade flow → unlocks features
- Crisis keyword triggers → displays resources immediately
- **Tools:** Playwright (web), Detox (React Native)

### 8.2 Specialized Testing

#### Theological Accuracy Testing
- Curated test dataset of 200+ theological questions with expert-reviewed correct answers
- Compare AI responses against expected guidance
- Automated checks for:
  - Correct scripture citations (no hallucinated verses)
  - Broadly evangelical doctrine alignment
  - No contradictory advice
- Manual theological review quarterly by advisory board

#### Safety & Crisis Testing
- Automated tests for all crisis keywords trigger appropriate responses
- Test boundary scenarios (medical, legal, severe mental health)
- Verify no bypassing of safety guardrails
- Red team testing for jailbreaking attempts

#### Performance Testing
- Load testing: 1000 concurrent users, <2s response time
- AI response latency: <5s for initial response, streaming for longer guidance
- Mobile app startup time: <3s on mid-range devices
- Database query optimization: <100ms for conversation retrieval

#### Accessibility Testing
- Automated: axe-core, Lighthouse audits
- Manual: Screen reader testing (VoiceOver, TalkBack)
- Keyboard navigation (web)
- Color contrast verification
- **Target:** WCAG 2.1 AA compliance

### 8.3 QA Workflow

```
Feature branch → Unit tests pass → PR review → Integration tests →
Staging deploy → Manual QA → Production
```

- **Automated CI/CD:** GitHub Actions or GitLab CI
- **Staging environment** mirrors production exactly
- **Beta testing group** (50-100 users) gets early access for real-world feedback

---

## 9. Infrastructure, Deployment & DevOps

### 9.1 Cloud Infrastructure (AWS Example)

**Core Services:**
- **Compute:** ECS Fargate (containerized API) or Lambda (serverless functions)
- **Database:** RDS PostgreSQL (managed, automated backups, Multi-AZ for HA)
- **Vector Database:** Pinecone (managed) or self-hosted Weaviate on ECS
- **AI Model Hosting:** AWS Bedrock (fine-tuned models) or SageMaker
- **Object Storage:** S3 (conversation exports, user uploads if any)
- **CDN:** CloudFront (web app assets, mobile app updates)
- **Authentication:** AWS Cognito or Auth0 (managed identity)
- **Payments:** Stripe (PCI compliance handled externally)

### 9.2 Environment Strategy

```
Production:  prod.mychrisiancounselor.com (live users)
Staging:     staging.mychrisiancounselor.com (pre-production testing)
Development: dev.mychrisiancounselor.com (feature testing)
Local:       localhost (developer machines)
```

### 9.3 Infrastructure as Code

- **Tool:** AWS CDK (TypeScript - matches app stack) or Terraform
- **Version Control:** All infrastructure in Git alongside application code
- **Modules:** Separate stacks for networking, database, compute, AI services
- **Benefits:** Reproducible environments, disaster recovery, easy scaling

### 9.4 CI/CD Pipeline

```
Git Push → GitHub Actions Triggered
  ├─ Run Linting (ESLint, Prettier)
  ├─ Run Unit Tests (Jest)
  ├─ Run Integration Tests
  ├─ Build Docker Images (API)
  ├─ Build Mobile Apps (Expo EAS)
  ├─ Build Web App (Next.js)
  ├─ Security Scanning (Snyk, OWASP)
  └─ Deploy to Target Environment
      ├─ Development (auto-deploy on merge to develop)
      ├─ Staging (auto-deploy on merge to main)
      └─ Production (manual approval required)
```

### 9.5 Mobile App Deployment

- **iOS:** TestFlight (beta) → App Store (production)
- **Android:** Internal testing → Open beta → Google Play Store
- **OTA Updates:** Expo Updates for non-native changes (JS bundle updates without app store review)

### 9.6 Monitoring & Observability

**Application Monitoring:**
- DataDog, New Relic, or CloudWatch
- **Error Tracking:** Sentry (React, React Native, Node.js)
- **Logging:** CloudWatch Logs or ELK Stack (centralized logging)

**Metrics to Track:**
- API response times, error rates
- AI model latency and accuracy
- User engagement (sessions per user, session duration)
- Conversion funnel (anonymous → registered → premium)
- Crisis detection triggers (anonymized)

**Alerts:** PagerDuty or Opsgenie for critical incidents
- API downtime
- Database connection failures
- AI service degradation
- Crisis keyword surge (potential issue)

### 9.7 Security Measures

- **Secrets Management:** AWS Secrets Manager or HashiCorp Vault
- **Network Security:** VPC with private subnets for database/AI services
- **WAF:** AWS WAF (DDoS protection, rate limiting)
- **SSL/TLS:** Auto-renewing certificates via AWS ACM
- **Dependency Scanning:** Automated security patches (Dependabot, Renovate)
- **Penetration Testing:** Annual third-party security audit

### 9.8 Backup & Disaster Recovery

- **Database:** Automated daily backups with 30-day retention, point-in-time recovery
- **Disaster Recovery Plan:** RTO (Recovery Time Objective) <4 hours, RPO (Recovery Point Objective) <1 hour
- **Multi-Region:** Consider for Phase 3 if user base justifies cost

---

## 10. Business Model, Metrics & Success Criteria

### 10.1 Pricing Strategy

#### Free Tier
- 20 questions per month
- Basic guided consultation (max 3 clarifying questions)
- Single Bible translation (NIV)
- No conversation history (session-only)
- No ads (preserve sanctity of counseling experience)

#### Premium Tier: $9.99/month or $99/year (17% discount)
- Unlimited questions
- Full adaptive consultation (up to 10 clarifying questions)
- All Bible translations
- Full conversation history with search
- Save unlimited guidance and scriptures
- Export conversations as PDF
- Priority support

#### Future Tiers (Phase 3)
- **Family Plan:** $19.99/month for 5 family members
- **Church/Pastoral:** Custom pricing for congregational access

### 10.2 Revenue Projections (Conservative)

**Year 1 (Post-V1 Launch):**
- 10,000 registered users
- 8% conversion to premium = 800 subscribers
- Monthly revenue: $7,992 (~$96K annual)
- Costs: ~$40K (infrastructure, AI, development)
- Net: ~$56K (funds continued development)

**Year 2:**
- 50,000 registered users
- 10% conversion = 5,000 subscribers
- Monthly revenue: $49,950 (~$600K annual)
- Costs: ~$150K
- Net: ~$450K (fund team expansion, marketing)

### 10.3 Key Success Metrics

#### Acquisition Metrics
- Website visitors → Sign-ups (target: 15%)
- App Store impressions → Installs (target: 5%)
- Organic search traffic growth (SEO investment pays off)

#### Engagement Metrics
- Sessions per user per month (target: 4+ for active users)
- Average session duration (target: 10-15 minutes)
- Questions asked per session (target: 1 initial + 3 clarifying)
- User satisfaction rating (target: 4.5+/5)
- Net Promoter Score (target: 50+)

#### Conversion Metrics
- Free → Premium conversion rate (target: 8-10%)
- Trial-to-paid conversion (if offering trials)
- Churn rate (target: <5% monthly)

#### Quality Metrics
- Theological accuracy rate (target: 95%+)
- Crisis detection accuracy (target: 99%+)
- AI response relevance (user feedback) (target: 90%+)
- App store ratings (target: 4.5+ stars)

#### Retention Metrics
- Day 1, 7, 30, 90 retention rates
- Premium subscriber lifetime value (target: 12+ months)
- Re-engagement rate after dormancy

### 10.4 Growth Strategy

#### Organic (Priority)
- SEO-optimized content: "Biblical guidance for [topic]" pages
- App Store Optimization (ASO): Keywords, screenshots, reviews
- Word of mouth: Shareable guidance feature
- Church partnerships: Recommend to congregations

#### Paid (Phase 2+)
- Google/Facebook ads targeting Christian keywords
- Podcast sponsorships (Christian podcasts)
- YouTube pre-roll on Christian content channels

#### Content Marketing
- Blog with Biblical guidance articles
- YouTube channel with common questions answered
- Email newsletter with weekly devotionals

#### Partnership Opportunities
- Church management software integrations (Planning Center, Faithlife)
- Christian podcast networks
- Seminary partnerships for training data validation
- Christian counseling organizations for referrals

---

## 11. Next Steps

### Immediate Actions
1. Set up monorepo structure with Nx/Turborepo
2. Create initial project scaffolding (API, web, mobile, shared packages)
3. Set up development infrastructure (local PostgreSQL, vector DB)
4. Begin MVP Phase 1 development starting with web platform
5. Assemble theological advisory board for training data review
6. Source and prepare initial training data (Bible translations, counseling resources)

### Phase 1 MVP Priorities
1. Backend API with basic counseling endpoints
2. RAG system with NIV Bible translation
3. Web frontend with conversation UI
4. Crisis detection and safety mechanisms
5. Beta user recruitment plan
6. Theological accuracy testing framework

---

## Appendix A: Technology Alternatives Considered

| Component | Chosen | Alternatives Considered | Why Chosen |
|-----------|--------|------------------------|------------|
| **Mobile** | React Native | Native (Swift/Kotlin), Flutter | Maximum code reuse, larger talent pool, proven at scale |
| **Backend** | NestJS | Express, Fastify, Python FastAPI | Structured architecture, TypeScript, dependency injection |
| **Database** | PostgreSQL | MongoDB, Firebase | Mature, reliable, strong ACID guarantees for sensitive data |
| **Monorepo** | Nx/Turborepo | Lerna, Yarn Workspaces | Better build optimization, modern tooling |
| **AI Hosting** | AWS Bedrock | OpenAI API, Self-hosted | Flexibility for fine-tuning, managed infrastructure |

---

## Appendix B: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI theological inaccuracy | Medium | High | Human review loop, theological testing, advisory board |
| User safety incidents | Low | Critical | Comprehensive crisis detection, clear disclaimers, resource links |
| Fine-tuning complexity | High | Medium | Start with RAG+prompting in MVP, iterate to fine-tuning |
| Slow user adoption | Medium | High | Strong SEO strategy, church partnerships, beta testing |
| Infrastructure costs exceed budget | Medium | Medium | Start serverless, monitor usage, optimize AI calls |
| Mobile app store rejection | Low | Medium | Follow guidelines strictly, clear disclaimers, age ratings |
| Data privacy breach | Low | Critical | Encryption, minimal collection, regular security audits |
| Denominational controversy | Medium | Medium | Broadly evangelical stance, clear positioning, user feedback |

---

**Document End**
