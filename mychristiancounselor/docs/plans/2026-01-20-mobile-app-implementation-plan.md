# Mobile App Implementation Plan - React Native for iOS & Android

**Date**: January 20, 2026
**Status**: Planning / Decision Pending
**Target Platforms**: iOS (iPhone, iPad) and Android
**Technology**: React Native
**Estimated Timeline**: 12-17 weeks (3-4 months with 1 developer)
**Estimated Cost**: $36,000 - $102,000 (development) + $500-1,200/year (infrastructure)

---

## Executive Summary

This document outlines the requirements, timeline, and costs for building native mobile applications for MyChristianCounselor on iOS and Android platforms using React Native.

### Key Points:

- **Code Reusability**: 60-70% of existing React web code can be shared
- **Timeline**: 480-680 hours total development time (3-4 months with 1 full-time developer)
- **Technology**: React Native provides native performance with JavaScript
- **Backend Changes**: Minimal (12 hours for push notification support)
- **Ongoing Maintenance**: 60-120 hours/year for OS updates and bug fixes

### Strategic Value:

1. **Market Expectation**: Mobile apps are standard for mental health platforms
2. **Push Notifications**: Critical for crisis alerts and counselor notifications
3. **User Engagement**: Mobile users typically show 3-5x higher engagement
4. **Offline Access**: Enables counseling sessions without internet connection
5. **Competitive Parity**: Most competitors offer native mobile apps

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Architecture Approach](#2-architecture-approach)
3. [Implementation Phases](#3-implementation-phases)
4. [Technical Requirements](#4-technical-requirements)
5. [Backend Changes](#5-backend-changes)
6. [Time & Cost Estimates](#6-time--cost-estimates)
7. [Challenges & Risks](#7-challenges--risks)
8. [Technology Options](#8-technology-options)
9. [Recommendation](#9-recommendation)
10. [Decision Criteria](#10-decision-criteria)

---

## 1. Technology Stack

### Primary Choice: React Native

**Why React Native?**
- ✅ Code reusability with existing React web codebase (60-70% shared logic)
- ✅ Single codebase for both iOS and Android
- ✅ Native performance with JavaScript bridge
- ✅ Large ecosystem and active community
- ✅ Existing React expertise on team
- ✅ Hot reloading for faster development
- ✅ Over-the-air (OTA) updates possible

**Technology Stack**:
```
Frontend:     React Native 0.73+
Navigation:   React Navigation 6.x
State:        React Context API (existing pattern)
Storage:      AsyncStorage (tokens), SQLite (offline data)
Security:     react-native-keychain (secure token storage)
Push:         Firebase Cloud Messaging + APNs
Analytics:    Firebase Analytics
Errors:       Sentry React Native SDK
Charts:       react-native-chart-kit or Victory Native
Camera:       react-native-camera (QR codes for 2FA)
Biometrics:   react-native-biometrics (Face ID, Touch ID)
Voice:        react-native-voice + react-native-tts
```

### Development Tools:

**Required**:
- macOS for iOS development (Xcode required)
- Xcode 14+ (iOS builds and simulator)
- Android Studio (Android builds and emulator)
- Node.js 18+
- React Native CLI or Expo

**Optional**:
- Fastlane (automated builds and deployments)
- Detox or Appium (E2E testing)
- GitHub Actions (CI/CD)

---

## 2. Architecture Approach

### Project Structure:

```
/packages
  /mobile (NEW)
    /src
      /screens          - Screen components (Login, Counsel, Profile, etc.)
      /components       - Reusable UI components (Button, Input, Card)
      /navigation       - React Navigation configuration
      /services         - API client, storage, notifications
      /hooks            - Custom hooks (useAuth, useSession)
      /utils            - Shared utilities
      /contexts         - React contexts (AuthContext, ThemeContext)
      /assets           - Images, fonts, icons
    /ios                - iOS native code and build config
    /android            - Android native code and build config
    package.json

  /shared (EXISTING)
    - Business logic, TypeScript types, validation
    - Reused by both web and mobile

  /web (EXISTING)
    - Next.js web application
    - Some components can be adapted for mobile

  /api (EXISTING)
    - NestJS backend (minimal changes needed)
```

### Code Reusability Strategy:

**Shared Code (60-70%)**:
- ✅ API client logic (`/web/src/lib/api.ts` → adapt for mobile)
- ✅ Business logic and validation
- ✅ TypeScript types from `@mychristiancounselor/shared`
- ✅ State management patterns (Context API)
- ✅ Utility functions (date formatting, validation, etc.)
- ✅ Constants and configuration

**Mobile-Specific Code (30-40%)**:
- UI components (React Native primitives vs HTML/CSS)
- Navigation (React Navigation vs Next.js App Router)
- Native features (push notifications, biometrics, camera)
- Platform-specific code (iOS vs Android differences)
- Offline storage and sync

### API Integration:

**No API Changes Required** - Mobile uses existing REST API:
- All `/v1/*` endpoints work as-is
- JWT authentication works identically
- Same request/response formats
- Same error handling

**New Endpoints Needed** (minimal):
- `POST /v1/mobile/devices` - Register device token for push notifications
- `DELETE /v1/mobile/devices/:token` - Unregister device
- `GET /v1/mobile/config` - App version checking, force update flags

---

## 3. Implementation Phases

### Phase 1: Foundation & Setup (2-3 weeks, 80-120 hours)

**Milestone**: Development environment ready, authentication working

#### 1.1 Project Setup (20 hours)
- Initialize React Native project (bare or Expo)
- Configure TypeScript, ESLint, Prettier
- Setup folder structure and module aliases
- Configure environment variables (dev, staging, prod)
- Setup version management and build numbers

#### 1.2 Build Configuration (20 hours)
- **iOS Setup**:
  - Configure Xcode project
  - Setup provisioning profiles and certificates
  - Configure Bundle ID: `com.mychristiancounselor.app`
  - Setup signing for development and production

- **Android Setup**:
  - Configure Gradle build scripts
  - Setup keystore for app signing
  - Configure package name: `com.mychristiancounselor.app`
  - Setup ProGuard/R8 for code obfuscation

#### 1.3 CI/CD Pipeline (20 hours)
- Setup GitHub Actions workflows
- Automated builds for iOS and Android
- Automated testing on PR
- TestFlight/Play Store beta deployment
- Fastlane configuration (optional but recommended)

#### 1.4 Navigation & Architecture (20 hours)
- Setup React Navigation (stack + tab + drawer)
- Define navigation structure:
  ```
  App Navigator
    ├── Auth Stack (not logged in)
    │   ├── Welcome
    │   ├── Login
    │   ├── Register
    │   └── Password Reset
    └── Main Tab Navigator (logged in)
        ├── Counsel Tab
        │   ├── Session List
        │   └── Session Detail
        ├── Assessments Tab
        ├── Resources Tab
        └── Profile Tab
            ├── Settings
            ├── Subscription
            └── Privacy
  ```
- Implement deep linking for notifications
- Configure screen transitions and gestures

#### 1.5 Core Infrastructure (20 hours)
- Adapt API client for mobile (axios with interceptors)
- Implement secure token storage (react-native-keychain)
- Setup error tracking (Sentry SDK)
- Configure offline detection
- Setup loading states and error boundaries

**Deliverables**:
- ✅ Mobile app project structure
- ✅ Build scripts for iOS and Android
- ✅ CI/CD pipeline running
- ✅ Navigation framework configured
- ✅ API client integrated

---

### Phase 2: Core Features (4-5 weeks, 160-200 hours)

**Milestone**: Members can login, conduct counseling sessions, take assessments

#### 2.1 Authentication (40 hours)

**Screens**:
- Welcome/Onboarding (first-time users)
- Login (email + password)
- Register (account creation)
- Password Reset (email flow)
- 2FA Setup (TOTP QR code + email codes)
- 2FA Verification (code entry)

**Features**:
- JWT token management (access + refresh)
- Secure token storage (Keychain/Keystore)
- Biometric authentication (Face ID, Touch ID, fingerprint)
- Session persistence
- Auto-logout on token expiration
- Multiple device support
- Logout/logout all devices

**Native Features**:
- QR code scanner for TOTP setup (`react-native-camera`)
- Biometric prompt (`react-native-biometrics`)

#### 2.2 Counseling Session (60 hours)

**Screens**:
- Session List (all past sessions with search)
- Session Detail (active counseling conversation)
- Scripture Detail (verse display with translations)
- Crisis Resources (emergency contacts and hotlines)

**Features**:
- Chat interface with message bubbles
- Real-time typing indicators
- Message input with voice option
- AI responses with scripture references
- Crisis resource cards (immediate display)
- Session history with infinite scroll
- Search across sessions
- Session export (share HTML/PDF)
- Session sharing with token-based permissions
- Offline message queuing

**Native Features**:
- Voice input (speech-to-text via `react-native-voice`)
- Voice output (text-to-speech via `react-native-tts`)
- Share dialog for session exports
- Haptic feedback for sent messages

**UI Components**:
- Message bubble (user vs assistant styling)
- Scripture reference card (expandable)
- Crisis resource card (red alert styling)
- Typing indicator animation
- Input bar with voice button
- Session item (list view with preview)

#### 2.3 Assessments (30 hours)

**Screens**:
- Assessment List (available and completed)
- PHQ-9 Assessment (depression screening)
- GAD-7 Assessment (anxiety screening)
- Assessment Results (scores with interpretation)
- Historical Trends (charts over time)

**Features**:
- Clinical assessment forms (radio buttons, scoring)
- Automatic score calculation
- Severity interpretation display
- Historical charts (line charts for trends)
- Assessment reminders (local notifications)
- Progress tracking

**Charts**:
- Line charts for depression/anxiety/stress over time
- Color-coded severity indicators (green/yellow/red)
- Interactive tooltips on data points
- Chart library: `react-native-chart-kit` or Victory Native

#### 2.4 Profile & Settings (30 hours)

**Screens**:
- Profile (user info, avatar)
- Settings (app preferences)
- Subscription Management (Stripe portal link)
- Notification Preferences (granular controls)
- Privacy Controls (GDPR export/deletion)
- About (version, terms, privacy policy)

**Features**:
- Profile editing (name, email, avatar upload)
- Subscription status display
- Link to Stripe customer portal (web view)
- Notification preferences (by type: crisis, assessment, messages)
- GDPR data export (download JSON)
- GDPR data deletion (with 30-day grace period)
- 2FA management (enable/disable, backup codes)
- Theme selection (light/dark mode)
- Font size adjustment

**Deliverables**:
- ✅ Complete authentication flow
- ✅ Functional counseling session interface
- ✅ Assessment taking and results viewing
- ✅ Profile management and settings
- ✅ Beta app ready for internal testing

---

### Phase 3: Mobile-Specific Features (2-3 weeks, 80-120 hours)

**Milestone**: Native mobile experience with push notifications and offline support

#### 3.1 Push Notifications (40 hours)

**Setup**:
- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification service (APNs) for iOS
- Firebase project configuration
- Upload APNs certificate to Firebase
- Request notification permissions from user

**Backend Integration**:
- Store device tokens in database
- Send push notifications for:
  - Crisis alerts (immediate)
  - Wellbeing status changes (counselor alerts)
  - Assessment reminders (scheduled)
  - Book evaluation completion
  - Session messages (if enabled)

**Client-Side Handling**:
- Foreground notifications (in-app banner)
- Background notifications (system tray)
- Notification tap handling (deep link to content)
- Notification preferences (opt-in/opt-out by type)
- Badge count management
- Silent notifications for data sync

**Rich Notifications**:
- Notification images (crisis resources)
- Action buttons (View, Dismiss)
- Categories (Crisis, Assessment, Message)

#### 3.2 Offline Support (40 hours)

**Local Storage**:
- SQLite database for session history
- AsyncStorage for user preferences
- Secure storage (Keychain) for tokens

**Offline Capabilities**:
- View past sessions offline
- Read scripture references offline
- Queue messages for sending when online
- View assessment history offline
- Automatic sync when back online

**Sync Strategy**:
- Background fetch for new data
- Conflict resolution (server wins for now)
- Sync indicator in UI
- Manual refresh option (pull-to-refresh)

**Data Management**:
- Cache recent sessions (last 30 days)
- Limit cached data size (prune old sessions)
- Clear cache option in settings

#### 3.3 Mobile Optimizations (40 hours)

**UI/UX Enhancements**:
- Pull-to-refresh on all lists
- Infinite scroll for session history
- Swipe gestures (swipe to delete, swipe actions)
- Loading skeletons (better perceived performance)
- Empty states with illustrations
- Error states with retry buttons
- Haptic feedback for interactions

**Performance**:
- List virtualization (FlatList with optimization)
- Image caching and lazy loading
- Memo and useMemo for expensive operations
- Debounce search input
- Network request batching
- App startup optimization

**Network Resilience**:
- Automatic retry with exponential backoff
- Timeout handling
- Offline indicator banner
- Graceful degradation

**Deliverables**:
- ✅ Push notifications working
- ✅ Offline session viewing
- ✅ Message queuing and sync
- ✅ Optimized mobile performance

---

### Phase 4: Counselor & Advanced Features (2-3 weeks, 80-120 hours)

**Milestone**: Counselors can manage members via mobile app

#### 4.1 Counselor Dashboard (40 hours)

**Screens**:
- Member List (assigned members with status)
- Member Detail (comprehensive member view)
- Counselor Notes (private and shared)
- Historical Trends (charts for member wellbeing)

**Features**:
- Member list with wellbeing status indicators
- Priority sorting (red → yellow → green)
- Search and filter members
- Member profile with complete history
- Add/edit counselor notes
- View member sessions
- View assessment results
- Historical trend charts
- Coverage grant management (backup counselor)

**UI Adaptations**:
- Counselor-specific tab navigation
- Status indicators (color-coded badges)
- Quick actions (call, email, add note)
- Swipe actions for member items

#### 4.2 Additional Features (40 hours)

**Book Library**:
- Browse curated Christian books
- Search and filter by category
- View theological evaluation scores
- View evaluation breakdown
- Reading list management
- Receive notifications when evaluations complete

**Biblical Resources**:
- Scripture search (8 translations)
- Browse by book/chapter/verse
- Strong's Concordance integration
- Verse comparison side-by-side
- Favorite verses
- Share verses

**Crisis Resources**:
- Quick access to crisis hotlines
- 988 Suicide & Crisis Lifeline
- Crisis Text Line
- SAMHSA National Helpline
- Location-based resources
- One-tap calling

**Session Sharing**:
- Generate share link with token
- Set expiration date
- Toggle notes access permission
- Share via native share dialog
- Revoke share links

#### 4.3 Polish & UX (40 hours)

**Onboarding Tutorial**:
- First-time user walkthrough
- Feature highlights (tooltips)
- Skip option
- Don't show again preference

**Visual Polish**:
- App icon (1024x1024 + all required sizes)
- Splash screen with logo
- Loading states with animations
- Success/error animations
- Micro-interactions (button press, transitions)

**Accessibility**:
- Screen reader support (labels, hints)
- Dynamic type (respect system font size)
- Color contrast compliance (WCAG AA)
- Voice control support
- Reduced motion option

**Dark Mode**:
- Complete dark theme
- Respect system preference
- Manual toggle in settings
- Consistent colors across screens

**Error Handling**:
- Friendly error messages
- Contextual help text
- Retry options
- Support contact link

**Deliverables**:
- ✅ Full counselor mobile experience
- ✅ All major features implemented
- ✅ Polished UI with animations
- ✅ Accessibility compliant
- ✅ Dark mode support

---

### Phase 5: Testing & Deployment (2-3 weeks, 80-120 hours)

**Milestone**: Apps live in Apple App Store and Google Play Store

#### 5.1 Testing (60 hours)

**Unit Testing** (20 hours):
- Test business logic (API client, validation)
- Test utilities and helpers
- Test hooks (useAuth, useSession)
- Target: 80% code coverage

**Integration Testing** (20 hours):
- Test API integration (mock backend)
- Test navigation flows
- Test state management
- Test offline scenarios

**E2E Testing** (20 hours):
- Setup Detox or Appium
- Test critical user flows:
  - Login → Counseling → Logout
  - Register → 2FA Setup → Assessment
  - Counselor → View Member → Add Note
- Test on multiple devices (iOS and Android)
- Test different screen sizes

**Manual Testing**:
- Test on physical devices (iPhone, iPad, Android phones, tablets)
- Test on different OS versions (iOS 14+, Android 10+)
- Test push notifications (all scenarios)
- Test offline/online transitions
- Test app backgrounding/foregrounding
- Test deep links
- Test biometric authentication
- Test voice features

**Beta Testing** (2 weeks):
- TestFlight beta (iOS) - invite 20-50 users
- Google Play Beta (Android) - invite 20-50 users
- Collect feedback via surveys
- Monitor crash reports (Sentry)
- Monitor analytics (Firebase)
- Iterate on feedback

#### 5.2 App Store Submission (40 hours)

**Apple App Store** (20 hours):

**App Store Connect Setup**:
- Create app record
- Configure app information:
  - Name: MyChristianCounselor
  - Subtitle: Biblical Counseling & AI Guidance
  - Category: Health & Fitness > Mental Health
  - Content rating: 12+ (mental health topics)
  - Price: Free (with in-app subscriptions)

**App Store Listing**:
- Screenshots (6.5", 5.5" iPhone + iPad)
  - Counseling session screen
  - Assessment screen
  - Book library
  - Crisis resources
  - Profile/settings
- App preview video (15-30 seconds)
- Description (optimized for search):
  ```
  MyChristianCounselor provides 24/7 AI-powered biblical counseling
  with scripture-based guidance, mental health assessments, and crisis
  support. Connect with Christian counselors, track your wellbeing,
  and grow in faith.

  Features:
  • AI Biblical Counseling (8 Bible translations)
  • Depression & Anxiety Assessments (PHQ-9, GAD-7)
  • Crisis Detection & Resources (988 Lifeline)
  • Professional Counselor Connection
  • Wellbeing Tracking
  • Theological Book Evaluations
  • HIPAA-Compliant & Secure
  ```
- Keywords (100 character limit):
  ```
  christian counseling,biblical guidance,mental health,faith,
  depression,anxiety,prayer,scripture,therapy
  ```
- Support URL, Privacy Policy URL, Terms of Service URL

**Privacy & Compliance**:
- Privacy Nutrition Label:
  - Data collected: Email, Name, Health data (assessments)
  - Data usage: App functionality, Support
  - Tracking: None
  - Third parties: AWS, Stripe, Sentry
- Export Compliance: No encryption beyond OS (select No)
- Content Rights: Original content (select Yes)

**App Review Information**:
- Demo account credentials (non-subscription account)
- Notes for reviewer:
  ```
  This is a mental health/biblical counseling app.

  Features requiring review:
  - AI-powered counseling (uses AWS Bedrock Claude models)
  - Crisis detection (displays 988 Suicide & Crisis Lifeline)
  - Mental health assessments (PHQ-9, GAD-7 clinical standards)

  Demo account provided has sample data for testing.

  HIPAA Compliance: All health data is encrypted and stored securely.
  ```

**Submission**:
- Upload build via Xcode or Transporter
- Submit for review
- Monitor status (typically 1-3 days)
- Respond to any rejection reasons
- Resubmit if needed

**Google Play Store** (20 hours):

**Google Play Console Setup**:
- Create app record
- Configure app details:
  - Name: MyChristianCounselor
  - Short description (80 chars):
    ```
    Biblical counseling with AI guidance. HIPAA-compliant mental health support.
    ```
  - Full description (4000 chars):
    ```
    [Similar to App Store, optimized for Android audience]
    ```
  - Category: Health & Fitness
  - Content rating questionnaire (ESRB/PEGI)
  - Target audience: 13+

**Store Listing**:
- Screenshots (phone + tablet, multiple sizes)
- Feature graphic (1024x500)
- App icon (512x512)
- Promo video (YouTube link, optional)

**Privacy & Security**:
- Data safety form:
  - Data collected: Contact info, Health info, User IDs
  - Data usage: App functionality, Analytics
  - Security practices: Encrypted in transit, Encrypted at rest
- Privacy policy URL
- Developer contact information

**App Content**:
- Content rating (fill questionnaire)
- Target audience (13+)
- News app declaration (No)
- COVID-19 tracing app (No)
- Government app (No)

**Pricing & Distribution**:
- Free (with in-app purchases)
- Available in: United States (expand later)
- Device categories: Phone, Tablet

**Release**:
- Upload AAB (Android App Bundle)
- Internal testing track (first)
- Closed testing track (beta)
- Production track (final release)
- Staged rollout: 10% → 50% → 100% over 1 week

**Post-Release**:
- Monitor crash reports (Google Play Console + Sentry)
- Monitor reviews and respond
- Monitor performance metrics

#### 5.3 Documentation & Training (20 hours)

**Developer Documentation**:
- Setup instructions (development environment)
- Build instructions (iOS and Android)
- Deployment procedures
- Troubleshooting guide
- Architecture overview
- Code style guide

**User Documentation**:
- Help center articles for mobile app
- Video tutorials (optional)
- FAQ updates
- Release notes

**Team Training**:
- Support team: Mobile app features and troubleshooting
- Marketing team: App store optimization, screenshots, descriptions
- Product team: Mobile analytics and user feedback

**Deliverables**:
- ✅ Apps live in App Store and Play Store
- ✅ Beta testing completed
- ✅ User feedback incorporated
- ✅ Documentation complete
- ✅ Team trained on mobile support

---

## 4. Technical Requirements

### Development Environment:

**Hardware**:
- **macOS required** for iOS development (iMac, MacBook Pro, Mac mini)
  - Xcode only runs on macOS
  - iOS Simulator requires macOS
  - Cannot build iOS apps on Windows/Linux
- 16GB+ RAM recommended (32GB ideal for running simulators)
- 50GB+ free disk space (Xcode + simulators + Android Studio)

**Software**:
- macOS 12+ (Monterey or later)
- Xcode 14+ (download from Mac App Store, ~15GB)
- Android Studio (download from android.com, ~5GB)
- Node.js 18+ (LTS version)
- Watchman (file watching, installed via Homebrew)
- CocoaPods (iOS dependency manager, installed via gem)
- Java JDK 11 or 17 (for Android builds)

**Accounts**:
- Apple Developer Program ($99/year) - **required for iOS distribution**
- Google Play Console ($25 one-time) - **required for Android distribution**
- Firebase account (free)
- GitHub account (for CI/CD)

### Third-Party Services:

**Push Notifications** (Firebase Cloud Messaging):
- Free tier: 10 million notifications/month
- No cost for typical usage
- Setup: Firebase project, APNs certificate upload

**Error Tracking** (Sentry):
- Pricing: $26-80/month (based on events)
- 5,000 events/month on Developer plan ($26/month)
- 50,000 events/month on Team plan ($80/month)

**Analytics** (Firebase Analytics):
- Completely free
- Unlimited events and users
- Integrates with Google Analytics 4

**Code Signing**:
- Apple Developer: $99/year (required)
- Google Play: $25 one-time (required)
- Additional: Code signing certificates (free to generate)

**Hosting** (for deep links):
- Firebase Dynamic Links (free) or Branch.io (freemium)
- Only needed if implementing deep links for share links

### Device Testing:

**Minimum Requirements**:
- Test on physical iOS device (iPhone)
- Test on physical Android device (phone)

**Recommended**:
- Multiple iOS devices (different screen sizes: iPhone SE, iPhone 14, iPhone 14 Pro Max)
- Multiple Android devices (different manufacturers: Samsung, Google Pixel)
- iPad for tablet testing
- Android tablet for tablet testing

**Alternatives**:
- iOS Simulator (free, included with Xcode)
- Android Emulator (free, included with Android Studio)
- BrowserStack or Sauce Labs (cloud device testing, ~$40/month)

---

## 5. Backend Changes

### Minimal Backend Changes Required (12 hours total)

The existing API at `/v1/*` works as-is for mobile. Only need to add push notification support.

#### 5.1 Device Registration (4 hours)

**New Database Model**:
```prisma
// packages/api/prisma/schema.prisma
model MobileDevice {
  id            String   @id @default(cuid())
  userId        String
  deviceToken   String   @unique // FCM or APNs token
  platform      String   // 'ios' or 'android'
  deviceName    String?  // iPhone 14 Pro, Samsung Galaxy S21
  appVersion    String   // 1.0.0
  osVersion     String?  // iOS 16.5, Android 13
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastSeenAt    DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceToken])
}
```

**New Endpoints**:
```typescript
// packages/api/src/mobile/mobile.controller.ts

@Controller('mobile')
@UseGuards(JwtAuthGuard)
export class MobileController {

  // Register device for push notifications
  @Post('devices')
  async registerDevice(
    @GetUser() user: User,
    @Body() dto: RegisterDeviceDto,
  ) {
    // dto: { deviceToken, platform, deviceName, appVersion, osVersion }
    return this.mobileService.registerDevice(user.id, dto);
  }

  // Unregister device (on logout)
  @Delete('devices/:token')
  async unregisterDevice(
    @GetUser() user: User,
    @Param('token') deviceToken: string,
  ) {
    return this.mobileService.unregisterDevice(user.id, deviceToken);
  }

  // Get app configuration (version check, force update)
  @Get('config')
  async getConfig() {
    return {
      minVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
      maintenanceMode: false,
    };
  }
}
```

#### 5.2 Push Notification Service (8 hours)

**Dependencies**:
```bash
npm install firebase-admin --workspace=packages/api
```

**Service Implementation**:
```typescript
// packages/api/src/notifications/push-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    try {
      // Get all active devices for user
      const devices = await this.prisma.mobileDevice.findMany({
        where: { userId, isActive: true },
      });

      if (devices.length === 0) {
        this.logger.debug(`No devices registered for user ${userId}`);
        return;
      }

      const tokens = devices.map(d => d.deviceToken);

      // Send multicast message
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        tokens,
      };

      const response = await admin.messaging().sendMulticast(message);

      // Handle failed tokens (remove invalid devices)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            this.logger.warn(
              `Failed to send to token ${tokens[idx]}: ${resp.error?.message}`,
            );
          }
        });

        // Remove invalid tokens from database
        await this.prisma.mobileDevice.updateMany({
          where: { deviceToken: { in: failedTokens } },
          data: { isActive: false },
        });
      }

      this.logger.log(
        `Sent push notification to ${response.successCount}/${tokens.length} devices for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`, error.stack);
    }
  }

  async sendCrisisAlert(userId: string, sessionId: string): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Crisis Support Available',
      body: 'We detected you may be in crisis. Tap for immediate resources.',
      data: {
        type: 'crisis_alert',
        sessionId,
        deepLink: `mycc://counsel/${sessionId}`,
      },
    });
  }

  async sendWellbeingAlert(
    counselorId: string,
    memberId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.sendToUser(counselorId, {
      title: 'Member Wellbeing Update',
      body: `Member wellbeing changed from ${oldStatus} to ${newStatus}`,
      data: {
        type: 'wellbeing_change',
        memberId,
        deepLink: `mycc://counselor/members/${memberId}`,
      },
    });
  }

  async sendAssessmentReminder(userId: string, assessmentId: string): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Assessment Reminder',
      body: 'Time to complete your weekly assessment',
      data: {
        type: 'assessment_reminder',
        assessmentId,
        deepLink: `mycc://assessments/${assessmentId}`,
      },
    });
  }
}
```

**Integration with Existing Events**:
```typescript
// packages/api/src/counsel/wellbeing-notification.service.ts
// Add to existing service:

constructor(
  // ... existing injections
  private readonly pushNotificationService: PushNotificationService,
) {}

@OnEvent(EVENT_TYPES.WELLBEING_STATUS_CHANGED)
async handleWellbeingStatusChanged(event: WellbeingStatusChangedEvent): Promise<void> {
  // ... existing email notification code

  // NEW: Send push notification to counselors
  for (const counselorId of event.counselorIds) {
    await this.pushNotificationService.sendWellbeingAlert(
      counselorId,
      event.userId,
      event.oldStatus,
      event.newStatus,
    );
  }
}
```

**Environment Variables**:
```bash
# packages/api/.env
FIREBASE_PROJECT_ID=mychristiancounselor
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@mychristiancounselor.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Migration**:
```bash
cd packages/api
npx prisma migrate dev --name add-mobile-device-model
```

---

## 6. Time & Cost Estimates

### Development Time Breakdown:

| Phase | Duration | Hours | % of Total |
|-------|----------|-------|------------|
| **Phase 1: Foundation & Setup** | 2-3 weeks | 80-120 | 17% |
| **Phase 2: Core Features** | 4-5 weeks | 160-200 | 33% |
| **Phase 3: Mobile Features** | 2-3 weeks | 80-120 | 17% |
| **Phase 4: Advanced Features** | 2-3 weeks | 80-120 | 17% |
| **Phase 5: Testing & Deploy** | 2-3 weeks | 80-120 | 17% |
| **TOTAL** | **12-17 weeks** | **480-680** | **100%** |

### Timeline by Team Size:

| Team Size | Timeline | Notes |
|-----------|----------|-------|
| 1 developer | 3-4 months | 480-680 hours / 40hr week = 12-17 weeks |
| 2 developers | 1.5-2 months | Parallel work on iOS/Android or features |
| 3 developers | 1-1.5 months | Parallel work on features + testing |

**Assumptions**:
- Full-time work (40 hours/week)
- Experienced React Native developer
- No major blockers or scope changes
- Backend support available for push notifications

### Development Cost Breakdown:

| Scenario | Rate | Hours | Total Cost |
|----------|------|-------|------------|
| **Contractor (Junior)** | $75/hr | 480-680 | $36,000 - $51,000 |
| **Contractor (Mid-level)** | $100/hr | 480-680 | $48,000 - $68,000 |
| **Contractor (Senior)** | $150/hr | 480-680 | $72,000 - $102,000 |
| **Agency** | $150-200/hr | 480-680 | $72,000 - $136,000 |
| **Internal Developer** | Salary | 3-4 months | 3-4 months of salary |

**Recommendation**: Mid-level React Native contractor ($100/hr) = **$48,000 - $68,000**

### Infrastructure Costs:

**One-Time Costs**:
| Item | Cost |
|------|------|
| Apple Developer Program | $99/year |
| Google Play Console | $25 one-time |
| **Total One-Time** | **$124** |

**Annual Recurring Costs**:
| Service | Cost/Month | Cost/Year |
|---------|------------|-----------|
| Apple Developer (renewal) | - | $99 |
| Firebase (push notifications) | $0 | $0 |
| Sentry (error tracking) | $26-80 | $312-960 |
| **Total Annual** | **$26-80** | **$411-1,059** |

**Rounded Total**: ~**$500-1,200/year**

### Ongoing Maintenance Costs:

| Activity | Hours/Year | Cost/Year (@$100/hr) |
|----------|------------|----------------------|
| OS updates (iOS/Android) | 40-80 | $4,000 - $8,000 |
| Bug fixes | 20-40 | $2,000 - $4,000 |
| Security patches | 10-20 | $1,000 - $2,000 |
| Feature updates | Variable | Variable |
| **Total Maintenance** | **70-140** | **$7,000 - $14,000** |

### Total 3-Year Cost of Ownership:

| Item | Cost |
|------|------|
| Initial Development | $48,000 - $68,000 |
| Infrastructure (3 years) | $1,500 - $3,600 |
| Maintenance (3 years) | $21,000 - $42,000 |
| **Total 3-Year Cost** | **$70,500 - $113,600** |

**Average**: ~**$92,000** over 3 years (~$30,000/year)

---

## 7. Challenges & Risks

### Technical Challenges:

#### 7.1 Platform Differences

**iOS vs Android**:
- **Navigation patterns**: iOS (bottom tabs, modal) vs Android (drawer, back button)
- **Design guidelines**: iOS Human Interface vs Material Design
- **Permissions**: iOS more restrictive (especially location, camera)
- **Push notifications**: APNs vs FCM have different behaviors
- **Biometrics**: Face ID vs Touch ID vs Fingerprint have different APIs

**Mitigation**:
- Use React Navigation (handles platform differences)
- Use platform-specific components where needed: `Platform.select()`
- Test extensively on both platforms
- Follow platform-specific design patterns

#### 7.2 Voice Features Adaptation

**Current Implementation** (Web):
- Uses browser APIs: `SpeechRecognition`, `speechSynthesis`
- No cost, built into browser
- Works offline

**Mobile Implementation** (Required):
- **Text-to-Speech**: `react-native-tts` (native module)
- **Speech-to-Text**: `react-native-voice` (native module)
- Requires native module setup and configuration
- May require permissions (microphone access)

**Additional Effort**: +16-24 hours

**Challenges**:
- Different API surface (not drop-in replacement)
- iOS Speech framework vs Android SpeechRecognizer
- Permissions handling (user must grant microphone access)
- Offline vs online recognition (accuracy vs privacy)

**Mitigation**:
- Use well-maintained libraries with active community
- Test on multiple devices and OS versions
- Provide clear permissions explanations to users
- Fallback to typing if voice unavailable

#### 7.3 2FA/Security Implementation

**QR Code Scanning**:
- Web: Use HTML5 camera API or upload image
- Mobile: Requires camera access via `react-native-camera` or `expo-camera`
- Permissions: Camera permission required

**Biometric Authentication**:
- Not available on web
- Mobile: `react-native-biometrics` for Face ID/Touch ID/Fingerprint
- Enrollment: User must have biometrics setup on device
- Fallback: Always provide password option

**Secure Storage**:
- Web: localStorage (not secure but acceptable for web)
- Mobile: **Must** use Keychain (iOS) or Keystore (Android)
- Library: `react-native-keychain`
- All tokens must be stored securely

**Additional Effort**: +8-12 hours

#### 7.4 Offline Complexity

**Challenges**:
- Sync strategy (when to sync, what to sync)
- Conflict resolution (user edits offline, server has newer data)
- Storage limits (can't cache everything)
- Data freshness (how old is too old?)
- Queue management (failed sends, duplicates)

**Mitigation**:
- Start simple: Read-only offline (view past sessions)
- Phase 2: Queue outgoing messages
- Server always wins for conflicts (simpler)
- Limit cache to recent data (last 30 days)
- Clear cache option for users

**Complexity Level**: Medium-High
**Risk**: Medium (can simplify if needed)

#### 7.5 Code Reusability Reality Check

**Realistic Code Sharing**: 40-50% (not 60-70%)

**Actually Reusable**:
- TypeScript types (100% reusable)
- API client logic (80% reusable, needs mobile adapters)
- Business logic (validation, calculations) (90% reusable)
- Utility functions (80% reusable)

**Not Reusable**:
- UI components (0% - React vs React Native primitives)
- Routing (0% - Next.js vs React Navigation)
- Styling (0% - CSS vs StyleSheet)
- Forms (20% - validation logic yes, UI no)

**Impact**:
- More development time than expected
- More testing needed
- More maintenance burden

**Mitigation**:
- Extract shared logic into `/packages/shared`
- Use TypeScript strictly for type safety
- Consider using React Native Web for web app (future consideration)

### Business Risks:

#### 7.6 App Store Rejections

**iOS App Review** is notoriously strict:
- Health/mental health apps face extra scrutiny
- May require proof of HIPAA compliance
- May require professional credentials documentation
- Crisis resources must be accurate and up-to-date
- AI-powered features may raise questions

**Common Rejection Reasons**:
- Insufficient functionality ("app is just a wrapper for website")
- Privacy policy issues (missing or incomplete)
- Health data handling concerns
- Misleading descriptions
- Crashes or bugs during review

**Android Review** is generally easier:
- Faster review (hours vs days)
- Less likely to reject for subjective reasons
- Still requires data safety form and privacy policy

**Mitigation**:
- Prepare thorough documentation for reviewers
- Include demo account with sample data
- Write clear notes explaining AI features and crisis detection
- Have privacy policy and terms of service ready
- Test thoroughly before submission
- **Budget 1-2 weeks for review and potential resubmission**

**Risk Level**: Medium
**Impact**: Could delay launch by 1-4 weeks

#### 7.7 Maintenance Burden

**Additional Maintenance**:
- Now maintaining **3 codebases**: Web, iOS app, Android app
- OS updates: iOS (annual), Android (annual)
- Breaking changes in dependencies
- App store requirement changes (happens)
- Device fragmentation (especially Android)

**Time Commitment**:
- 2-4 hours/week for monitoring
- 40-80 hours/year for OS updates
- 20-40 hours/year for bug fixes
- Variable for new features

**Team Requirements**:
- Need React Native expertise on team (or retain contractor)
- Need macOS for iOS development
- Need Android device(s) for testing
- Need to monitor 2 app stores (reviews, crashes)

**Mitigation**:
- Use Expo for easier upgrades (if using Expo)
- Automate builds and deployments (Fastlane, GitHub Actions)
- Use error tracking (Sentry) to catch issues early
- Keep dependencies up to date (monthly)
- Allocate 5-10% of dev time for mobile maintenance

**Risk Level**: Medium
**Impact**: Ongoing cost and time commitment

#### 7.8 User Expectations

**Mobile Users Expect**:
- Offline access (not always using wifi)
- Push notifications (immediate alerts)
- Native performance (smooth scrolling, fast)
- Biometric login (convenient)
- Small app size (under 100MB)
- Battery efficiency (not draining battery)

**Potential Issues**:
- Feature parity with web (users notice missing features)
- Performance on low-end devices (Android fragmentation)
- Storage usage (cached data, media)
- Data usage (syncing, images)

**Mitigation**:
- Clearly communicate feature differences
- Optimize performance (list virtualization, image compression)
- Provide settings for data usage (wifi-only sync)
- Monitor performance metrics (Firebase Performance)

**Risk Level**: Low-Medium
**Impact**: User satisfaction and retention

#### 7.9 Cost Overruns

**Reasons for Cost Overruns**:
- Scope creep (adding features mid-development)
- Technical challenges taking longer than estimated
- App store rejections requiring rework
- Testing revealing major bugs
- iOS/Android differences requiring platform-specific code
- Third-party library issues (bugs, breaking changes)

**Historical Data**:
- Mobile projects typically run **20-40% over budget**
- Timeline slips are common (especially first mobile app)

**Mitigation**:
- Add 20-30% buffer to estimates
- Use phased approach (MVP first, then features)
- Weekly check-ins to catch issues early
- Strict scope control (no "while we're here" additions)
- Use time-and-materials contract (not fixed-price)

**Budget Recommendation**:
- **Planned**: $48,000 - $68,000
- **With 30% buffer**: $62,400 - $88,400
- **Budget**: ~**$75,000** to be safe

---

## 8. Technology Options

### Option 1: React Native (Bare Workflow) ✅ RECOMMENDED

**Description**: Full React Native with direct access to native code.

**Pros**:
- ✅ Best performance (native modules, optimizations)
- ✅ Full access to native APIs (no limitations)
- ✅ Smaller app size (~15-30MB)
- ✅ More control over build process
- ✅ No proprietary lock-in
- ✅ Industry standard for production apps

**Cons**:
- ❌ More complex setup (Xcode, Android Studio)
- ❌ Requires some native knowledge for advanced features
- ❌ Manual updates (no OTA for native code)
- ❌ Steeper learning curve

**Best For**: Production-ready app with long-term support plan

**Estimated Time**: 480-680 hours (as detailed in this plan)

---

### Option 2: Expo Managed Workflow

**Description**: React Native with Expo tooling and managed services.

**Pros**:
- ✅ Easier setup (no Xcode/Android Studio initially)
- ✅ Over-the-air (OTA) updates for JS code
- ✅ Easier development workflow
- ✅ Good documentation and community
- ✅ Many pre-built native modules

**Cons**:
- ❌ Limited native modules (may need to eject)
- ❌ Larger app size (~40-60MB)
- ❌ Less control over native code
- ❌ Some performance overhead
- ❌ Proprietary tooling (Expo lock-in)

**Best For**: MVP or proof of concept, rapid prototyping

**Estimated Time**: 400-600 hours (20% faster than bare workflow)

**Note**: Can always eject to bare workflow later if needed.

---

### Option 3: Progressive Web App (PWA)

**Description**: Enhanced web app installable on mobile devices.

**Pros**:
- ✅ Reuse 100% of web code (no mobile-specific development)
- ✅ One codebase for all platforms
- ✅ No app store approval needed
- ✅ Instant updates (no waiting for review)
- ✅ Lowest development cost

**Cons**:
- ❌ No push notifications on iOS (major limitation)
- ❌ Limited native features (no biometrics, limited offline)
- ❌ Not a "real" app (users may not trust it)
- ❌ Performance not as good as native
- ❌ Limited discoverability (not in app stores)
- ❌ iOS Safari limitations (cache limits, no camera API)

**Best For**: Quick mobile presence without native development

**Estimated Time**: 40-80 hours (mostly PWA configuration)

**Not Recommended** because:
- Push notifications are critical for crisis alerts
- Mental health apps need app store presence for credibility
- Offline support is important for counseling sessions

---

### Option 4: Flutter

**Description**: Google's cross-platform framework using Dart language.

**Pros**:
- ✅ High performance (compiled to native)
- ✅ Beautiful UI (Material Design built-in)
- ✅ Hot reload
- ✅ Growing ecosystem

**Cons**:
- ❌ New language (Dart) - team would need to learn
- ❌ Can't reuse React code
- ❌ Smaller community than React Native
- ❌ Less mature for web

**Best For**: Teams already using Dart or starting from scratch

**Estimated Time**: 600-800 hours (no code reuse, new language)

**Not Recommended** because:
- Team already has React expertise
- Would lose all web code reuse
- Higher risk due to new technology

---

### Comparison Matrix:

| Criteria | React Native (Bare) | Expo | PWA | Flutter |
|----------|---------------------|------|-----|---------|
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Code Reuse** | ⭐⭐⭐⭐ (60%) | ⭐⭐⭐⭐ (60%) | ⭐⭐⭐⭐⭐ (100%) | ⭐ (0%) |
| **Native Features** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Development Speed** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **App Size** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Community** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Long-term Viability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Push Notifications** | ✅ Full | ✅ Full | ❌ iOS Limited | ✅ Full |
| **Offline Support** | ✅ Full | ✅ Full | ⚠️ Limited | ✅ Full |
| **App Store Presence** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |

---

## 9. Recommendation

### Primary Recommendation: React Native (Bare Workflow)

**Why React Native Bare Workflow?**

1. **Production-Ready**: Industry standard for production mobile apps (Facebook, Instagram, Discord, Shopify)
2. **Code Reuse**: 60% of business logic reusable from web app
3. **Team Fit**: Team already has React expertise
4. **Performance**: Native-level performance for counseling chat and real-time features
5. **Native Features**: Full access to push notifications, biometrics, offline storage
6. **Long-term**: No proprietary lock-in, can maintain indefinitely

**Timeline**: 3-4 months with 1 full-time developer

**Budget**: $48,000 - $68,000 (development) + $500-1,200/year (infrastructure)

### Alternative Recommendation: Expo (If Speed is Priority)

**When to Choose Expo**:
- Need MVP in 2-3 months
- Want to validate mobile demand before full investment
- Don't need advanced native features initially
- Willing to potentially eject later

**Timeline**: 2-3 months with 1 full-time developer (20% faster)

**Budget**: $40,000 - $60,000 (development)

**Migration Path**: Can eject to bare React Native later if needed (~40 hours)

### NOT Recommended: PWA

**Reasons**:
- ❌ No push notifications on iOS (dealbreaker for crisis alerts)
- ❌ Limited offline support (important for counseling)
- ❌ No app store presence (hurts credibility)
- ❌ Not perceived as "real" app by users

**Only Consider If**:
- Budget is extremely limited (<$10,000)
- Need something immediately (2-4 weeks)
- Willing to accept significant limitations

---

## 10. Decision Criteria

### Go / No-Go Decision Framework:

#### ✅ Proceed with Mobile App If:

1. **Strategic Fit**:
   - [ ] Mobile is part of long-term product strategy
   - [ ] Competitors have mobile apps (market expectation)
   - [ ] User feedback requests mobile app
   - [ ] Want to increase engagement (mobile users engage more)

2. **Budget Available**:
   - [ ] $50,000-75,000 budget available for development
   - [ ] Ongoing $10,000-15,000/year for maintenance
   - [ ] Willing to invest in mobile for 3+ years

3. **Team Readiness**:
   - [ ] Developer available for 3-4 months full-time
   - [ ] macOS available for iOS development
   - [ ] Team can support 3 platforms (web + iOS + Android)
   - [ ] Product team can manage mobile releases

4. **Business Justification**:
   - [ ] ROI projection positive (increased subscriptions, retention)
   - [ ] Push notifications will improve safety (crisis alerts)
   - [ ] Mobile users represent significant market segment
   - [ ] Can handle app store compliance (HIPAA, privacy)

#### ❌ Delay Mobile App If:

1. **Resource Constraints**:
   - [ ] Budget limited (<$40,000 available)
   - [ ] No developer available for 3+ months
   - [ ] No macOS available for iOS development
   - [ ] Team already stretched thin

2. **Strategic Uncertainty**:
   - [ ] Not sure if mobile is needed yet
   - [ ] Web app adoption still low (validate web first)
   - [ ] Market research shows web is sufficient
   - [ ] Other priorities higher ROI

3. **Technical Blockers**:
   - [ ] Backend not ready (API needs work)
   - [ ] Web app has significant bugs
   - [ ] Security/compliance issues unresolved
   - [ ] Infrastructure not scalable yet

### Questions to Answer:

**Market Questions**:
1. What % of users access web app on mobile browsers?
2. Are users requesting a mobile app?
3. Do competitors have mobile apps?
4. What's the typical mobile vs web usage in mental health?

**Financial Questions**:
1. What's the expected increase in subscriptions from mobile?
2. What's the user lifetime value (LTV)?
3. How many new users needed to justify $75k investment?
4. Can we afford ongoing maintenance ($10-15k/year)?

**Technical Questions**:
1. Is the current API ready for mobile (v1 endpoints stable)?
2. Is the backend scalable enough for mobile users?
3. Do we have React Native expertise or need to hire?
4. Can we support iOS development (need macOS)?

**Strategic Questions**:
1. Is mobile part of 2026 roadmap?
2. Would push notifications improve user outcomes?
3. Is offline access important for our users?
4. What's the opportunity cost (vs other features)?

---

## Next Steps (If Proceeding)

### Immediate Actions (Week 1):

1. **Decision Meeting**:
   - Review this document with stakeholders
   - Answer decision criteria questions
   - Get budget approval
   - Set timeline expectations

2. **Team Formation**:
   - Identify/hire React Native developer
   - Ensure macOS availability
   - Assign product owner for mobile
   - Assign designer for mobile UI/UX

3. **Account Setup**:
   - Purchase Apple Developer Program ($99/year)
   - Purchase Google Play Console ($25 one-time)
   - Create Firebase project
   - Setup Sentry mobile project

4. **Planning**:
   - Define MVP scope (which features Phase 1?)
   - Create detailed project plan
   - Setup tracking (Jira, Linear, etc.)
   - Define success metrics

### Month 1 Goals:

- ✅ Development environment setup complete
- ✅ CI/CD pipeline working
- ✅ Authentication working on mobile
- ✅ Basic counseling session interface functional
- ✅ Weekly demos to stakeholders

### Month 2 Goals:

- ✅ All core features implemented
- ✅ Push notifications working
- ✅ Internal beta testing started
- ✅ App store listings drafted

### Month 3 Goals:

- ✅ Beta testing with external users
- ✅ Bug fixes and polish complete
- ✅ App store submissions ready
- ✅ Marketing materials prepared

### Month 4 Goals:

- ✅ Apps approved in both stores
- ✅ Production release (staged rollout)
- ✅ Monitoring and support in place
- ✅ Post-launch roadmap defined

---

## Appendix

### A. Technology Learning Resources

**React Native**:
- Official Docs: https://reactnative.dev/docs/getting-started
- React Native Express: https://www.reactnative.express/
- Infinite Red Chain React Conf talks: https://www.youtube.com/c/ChainReactConf

**iOS Development**:
- Apple Developer: https://developer.apple.com/
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/

**Android Development**:
- Android Developer: https://developer.android.com/
- Play Store Policies: https://play.google.com/about/developer-content-policy/
- Material Design: https://material.io/design

**Push Notifications**:
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- React Native Firebase: https://rnfirebase.io/

### B. Example Timeline (Gantt Chart)

```
Week 1-2:  ████ Foundation Setup
Week 3-6:  ████████ Core Features (Auth, Counsel, Assessments)
Week 7-8:  ████ Mobile Features (Push, Offline)
Week 9-10: ████ Advanced Features (Counselor, Books)
Week 11:   ██ Testing
Week 12:   ██ Beta Testing
Week 13:   ██ App Store Submission
Week 14-15:██ Review & Launch
```

### C. Success Metrics

**Development Phase**:
- On-time delivery (within estimated timeline)
- On-budget delivery (within estimated budget)
- Code quality (test coverage >80%)
- Zero critical bugs in beta

**Launch Phase**:
- App store approval on first submission (or within 2 attempts)
- Launch in both stores within 2 weeks of each other
- Crash-free rate >99.5% (first 30 days)
- Average rating >4.5 stars (first 100 reviews)

**Post-Launch** (6 months):
- 10,000+ downloads (iOS + Android combined)
- 30% of active users on mobile (vs 70% web)
- Push notification opt-in rate >60%
- Mobile user retention rate >40% (30-day)
- Mobile-to-paid conversion rate ≥ web conversion rate

### D. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| App Store rejection | Medium | High | Prepare thorough documentation, demo account, clear policies |
| Developer availability | Low | High | Have backup contractor identified, stagger work if needed |
| Cost overrun (>30%) | Medium | Medium | Weekly budget reviews, strict scope control, 30% buffer |
| Timeline slip (>4 weeks) | Medium | Medium | Weekly status checks, identify blockers early, cut scope if needed |
| Performance issues | Low | High | Test on low-end devices, optimize early, monitor metrics |
| Push notification failures | Low | High | Thorough testing, fallback to email, monitoring with Sentry |
| Security vulnerability | Low | Critical | Code review, penetration testing, bug bounty program |
| Low adoption rate | Medium | Medium | Pre-launch marketing, onboarding tutorial, user feedback loop |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-20 | System | Initial comprehensive plan |

---

## Approval

**Prepared By**: Product/Engineering Team
**Review Recommended**: CTO, CFO, Head of Product
**Decision Required By**: [Date]
**Budgeted Amount**: $_______ (development) + $_______ (annual maintenance)

**Approved**: ☐ Yes  ☐ No  ☐ Delayed

**Signature**: _____________________  **Date**: _____________________

---

**END OF DOCUMENT**
