# MyChristianCounselor API

NestJS backend API for the MyChristianCounselor application, providing AI-powered Biblical counseling services with scripture-based guidance.

## Tech Stack

- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL 15+ with Prisma ORM
- **AI Services:** AWS Bedrock (Claude 4.5), OpenAI GPT-4
- **Storage:** AWS S3 with Glacier archival
- **Authentication:** Session-based with Passport.js
- **Testing:** Jest

## Features

- AI-guided counseling sessions with clarifying questions
- Scripture-based guidance using NIV Bible translation
- Crisis detection with immediate resources
- Biblical resource evaluation and storage management
- PDF upload and processing for Biblical content
- Multi-tier storage system (S3 Standard / Glacier)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- AWS account with S3 and Glacier access
- OpenAI API key or AWS Bedrock access

### Installation

1. Install dependencies
```bash
cd packages/api
npm install
```

2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations
```bash
npx prisma migrate dev
```

4. Start the development server
```bash
npm run dev
```

The API will be available at http://localhost:3000

## Environment Variables

### Core Configuration

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mychristiancounselor"

# Application
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="http://localhost:4200"

# Session
SESSION_SECRET="change-this-in-production"
```

### AI Service Configuration

```bash
# AWS Bedrock (Primary)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
BEDROCK_MODEL_ID=us.anthropic.claude-4-5-v2:0

# OpenAI (Alternative)
OPENAI_API_KEY="sk-..."
```

### AWS S3 Configuration

```bash
# S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=mychristiancounselor-active
```

### Glacier Configuration

```bash
# Glacier Archival
GLACIER_RESTORE_TIER=Standard  # Options: Standard (3-5 hours), Expedited (1-5 minutes), Bulk (5-12 hours)
GLACIER_RESTORE_DAYS=7         # Number of days to keep restored files accessible
```

### Cleanup Configuration

```bash
# Temporary File Management
TEMP_FILE_RETENTION_DAYS=7     # Number of days to keep temporary uploaded files
```

### Counseling Configuration

```bash
# Question Limits
MAX_CLARIFYING_QUESTIONS_FREE=3        # Maximum clarifying questions for free users
MAX_CLARIFYING_QUESTIONS_SUBSCRIBED=6  # Maximum clarifying questions for subscribed users
```

## Phase 9: Storage Tier Management

The Biblical Resources System implements a sophisticated multi-tier storage system for PDF resources based on their Biblical alignment scores.

### Storage Tiers

#### Active Tier (S3 Standard)
- **Purpose:** Store frequently accessed, high-quality Biblical resources
- **Criteria:** Books with ≥70% alignment score
- **Access:** Instant access to PDFs
- **Cost:** Higher storage cost, optimized for frequent access
- **Use Case:** Primary counseling resources with strong Biblical alignment

#### Archived Tier (S3 Glacier Flexible Retrieval)
- **Purpose:** Store low-quality or rarely accessed Biblical resources
- **Criteria:** Books with <70% alignment score
- **Access:** 3-5 hour restore time (Standard retrieval)
- **Cost:** Lower storage cost, optimized for archival
- **Use Case:** Resources with weaker Biblical alignment or infrequent access

### Storage Lifecycle

1. **Upload:** PDFs are uploaded to temporary storage
2. **Processing:** Content is extracted and evaluated for Biblical alignment
3. **Evaluation:** Book receives an alignment score (0-100%)
4. **Migration:** PDF is moved from temp storage to S3 active tier
5. **Tier Assignment:**
   - Score ≥70%: Remains in S3 Standard (active tier)
   - Score <70%: Moved to Glacier (archived tier)
6. **Cleanup:** Temporary files are deleted after retention period

### Restoring Archived Resources

Archived resources can be restored when needed:

```bash
# Restore a specific book PDF
POST /api/biblical-resources/books/:bookId/restore

# Parameters:
# - tier: "Standard" (3-5 hours), "Expedited" (1-5 minutes), "Bulk" (5-12 hours)
# - days: Number of days to keep restored (default: 7)
```

### Storage Management

The system includes automated storage management:

- **Automatic Cleanup:** Removes temporary files older than configured retention period
- **Tier Management:** Automatically moves PDFs based on alignment scores
- **Restore Tracking:** Monitors restore status and expiration dates
- **Cost Optimization:** Balances access speed with storage costs

### Environment Configuration

Ensure these environment variables are configured for storage tier management:

```bash
# Required for S3 operations
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=mychristiancounselor-active

# Optional Glacier configuration
GLACIER_RESTORE_TIER=Standard    # Default: Standard (3-5 hours)
GLACIER_RESTORE_DAYS=7           # Default: 7 days

# Optional cleanup configuration
TEMP_FILE_RETENTION_DAYS=7       # Default: 7 days
```

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models:

- **User:** User accounts and authentication
- **Organization:** Counseling organizations
- **Session:** Counseling sessions
- **Message:** Session messages with AI responses
- **BibleBook:** Biblical resources with metadata
- **BibleChapter:** Chapters with content and embeddings
- **BibleVerse:** Individual verses for precise referencing

### Running Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## API Documentation

### Core Endpoints

- **POST /api/sessions** - Create new counseling session
- **POST /api/sessions/:id/messages** - Send message in session
- **GET /api/sessions/:id** - Get session details
- **GET /api/scripture/search** - Search scripture content

### Biblical Resources Endpoints

- **POST /api/biblical-resources/books/upload** - Upload PDF resource
- **GET /api/biblical-resources/books** - List all books
- **GET /api/biblical-resources/books/:id** - Get book details
- **POST /api/biblical-resources/books/:id/restore** - Restore archived book
- **GET /api/biblical-resources/books/:id/chapters** - Get book chapters

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- pdf-storage.service.spec.ts
```

### Test Structure

```
test/
├── unit/                  # Unit tests
│   ├── services/         # Service tests
│   └── utils/            # Utility tests
└── integration/          # Integration tests
    ├── api/              # API endpoint tests
    └── database/         # Database tests
```

## Building

```bash
# Build for production
npm run build

# Build output location
dist/
```

## Deployment

### Production Build

```bash
# Install production dependencies
npm ci --production

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Start production server
npm start
```

### Docker

```bash
# Build Docker image
docker build -t mychristiancounselor-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AWS_ACCESS_KEY_ID="..." \
  -e AWS_SECRET_ACCESS_KEY="..." \
  mychristiancounselor-api
```

## Development

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Debugging

```bash
# Start in debug mode
npm run start:debug

# Connect debugger to localhost:9229
```

## Project Structure

```
packages/api/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── auth/                      # Authentication module
│   ├── users/                     # User management
│   ├── organizations/             # Organization management
│   ├── sessions/                  # Counseling sessions
│   ├── messages/                  # Session messages
│   ├── scripture/                 # Scripture search and referencing
│   ├── ai/                        # AI service integration
│   ├── biblical-resources/        # Biblical resources management
│   │   ├── books/                # Book management
│   │   ├── chapters/             # Chapter management
│   │   ├── pdf-processor/        # PDF processing
│   │   ├── pdf-storage/          # Storage tier management
│   │   └── evaluation/           # Biblical alignment evaluation
│   ├── storage/                   # File storage services
│   └── common/                    # Shared utilities
├── prisma/                        # Database schema and migrations
├── test/                          # Test files
└── dist/                          # Build output
```

## License

Proprietary - All rights reserved
