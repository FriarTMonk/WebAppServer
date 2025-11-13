# MyChristianCounselor - Phase 1 MVP

AI-powered Biblical counseling application providing scripture-based guidance through guided consultation.

## Project Structure

```
mychristiancounselor/
├── packages/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js web frontend
│   └── shared/       # Shared types and constants
├── docs/             # Design docs and plans
└── .worktrees/       # Git worktrees (not committed)
```

## Tech Stack

- **Monorepo:** Nx
- **Backend:** NestJS + TypeScript + PostgreSQL + Prisma ORM
- **Frontend:** Next.js 14 + React 18 + Tailwind CSS
- **AI:** OpenAI GPT-4
- **Database:** PostgreSQL 15+

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- OpenAI API key

### Installation

1. Clone repository
```bash
git clone <repo-url>
cd mychristiancounselor
```

2. Install dependencies
```bash
npm install
```

3. Set up database
```bash
cd packages/api
cp .env.example .env
# Edit .env with your PostgreSQL credentials and OpenAI API key
npx prisma migrate dev
cd ../..
```

4. Start services
```bash
# Terminal 1: Start API
npm run start:api

# Terminal 2: Start Web
npm run start:web
```

5. Open browser to http://localhost:4200

## Features (Phase 1)

- ✅ Anonymous web-based counseling sessions
- ✅ AI-guided consultation (max 3 clarifying questions)
- ✅ Scripture-based guidance with NIV Bible
- ✅ Crisis detection with immediate resources
- ✅ Clean, responsive UI
- ❌ User accounts (Phase 2)
- ❌ Conversation history (Phase 2)
- ❌ Mobile apps (Phase 2)

## Testing

```bash
# Run API tests
npm run test:api

# Run Web tests
npm run test:web

# Manual testing
See docs/testing/phase1-manual-test-plan.md
```

## Documentation

- [Design Document](docs/plans/2025-11-10-mychristiancounselor-design.md)
- [Implementation Plan](docs/plans/2025-11-10-phase1-mvp-implementation.md)
- [API Documentation](packages/api/README.md)
- [Web Documentation](packages/web/README.md)

## License

Proprietary - All rights reserved
