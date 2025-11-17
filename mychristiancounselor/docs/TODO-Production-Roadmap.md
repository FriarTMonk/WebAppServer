# MyChristianCounselor - Production Roadmap

**Last Updated:** November 16, 2025
**Target:** Beta Deployment with >90% Test Coverage

---

## **CRITICAL FIXES (Do First!)**

### ✅ 0.1 Notes Loading Error - COMPLETED
- **Issue:** "Failed to load notes" error when there are no notes
- **Fix:** Handle empty notes gracefully, don't attempt load if none exist
- **Status:** ✅ COMPLETED - Modified SessionNotesPanel.tsx to handle 404/empty notes as normal state
- **File:** `/packages/web/src/components/SessionNotesPanel.tsx:43-52`

### ✅ 0.2 Session Timeout Handling - COMPLETED
- **Issue:** Org error thrown when session expires and user navigates to home
- **Fix:** Redirect to home as anonymous user, no org check required
- **Status:** ✅ COMPLETED - Added axios interceptor in AuthContext to catch 401/403 globally
- **File:** `/packages/web/src/contexts/AuthContext.tsx:46-70`

---

## **PHASE 1: Core Features (Before Beta)**

### 1. Share Functionality
- Create share modal UI with token generation
- Implement copy-to-clipboard
- Add expiration date options
- Backend endpoint to create/manage shares (schema already exists)
- **Status:** TODO
- **File:** `/packages/web/src/app/history/page.tsx:148-151` (TODO comment)

### 2. Counselor Page & Permissions
- Build counselor dashboard to view shared sessions
- Implement permission checks for viewing/adding notes
- Add counselor-specific UI elements
- Test role-based access control
- **Status:** TODO

### 3. Enhance Organization Page
- *(Specific enhancements TBD)*
- **Status:** TODO

---

## **PHASE 2: Authentication & Security**

### 4. Email Verification Flow
- Send verification emails on registration
- Create email verification endpoint
- Update UI to show verification status
- Resend verification option
- **Status:** TODO
- **Schema:** User.emailVerified, User.verificationToken

### 5. Password Reset Flow
- "Forgot password" UI
- Send reset emails
- Reset token validation
- New password form
- **Status:** TODO
- **Schema:** User.resetToken, User.resetTokenExpiry

### 6. Session Expiration Handling
- Implement auth interceptor to catch 401/403
- Redirect to home as guest (no org check)
- Clear local storage/tokens
- Show appropriate message
- **Status:** TODO
- **Related to:** Critical Fix 0.2

### 7. Security Review
- Review CORS settings for production
- Implement rate limiting
- Audit authentication flows
- Check for SQL injection vulnerabilities
- Review file upload security (if applicable)
- **Status:** TODO

---

## **PHASE 3: Testing (>90% Coverage Target)**

### 8. Set Up Test Infrastructure
- Configure Jest/testing framework
- Add coverage reporting
- Set up CI/CD for automated testing
- **Status:** TODO
- **Current Coverage:** ~0% (no test configuration)
- **Files Found:**
  - `/packages/api/src/safety/safety.service.spec.ts`
  - `/packages/api/src/auth/auth.service.spec.ts`
  - `/packages/api/src/organization/organization.service.spec.ts`
  - `/packages/api/src/admin/guards/is-platform-admin.guard.spec.ts`

### 9. Write Tests
- **API Services:** Auth, Profile, Counsel, Organization, Admin
- **Controllers:** All endpoints
- **Guards & Middleware:** Authentication, permissions
- **E2E Tests:** Critical user flows
- **Target:** >90% code coverage
- **Status:** TODO

---

## **PHASE 4: Monitoring & Maintenance**

### 10. Email Notifications
- Share notifications
- Organization invitations
- Password reset emails
- Session expiration warnings
- **Status:** TODO
- **Note:** Critical for production

### 11. Admin Page Enhancements
- Display automated cleanup job results
- Show last run time, items cleaned
- Add manual trigger for cleanup
- Cleanup history/logs
- **Status:** TODO
- **Current:** Base metrics dashboard exists

### 12. Verify Automated Cleanup
- Test expired session deletion
- Verify 30-day archive deletion
- Add logging/monitoring
- Ensure job runs on schedule
- **Status:** TODO
- **Schema:** Session.deletedAt, Session.archivedAt

---

## **PHASE 5: Documentation & Deployment Prep**

### 13. Update Documentation
- Remove outdated TODO comments (like scripture API comment at `/packages/web/src/components/SessionExportView.tsx:330`)
- User guide for all features
- Admin documentation
- API documentation (if exposing APIs)
- Deployment guide
- **Status:** TODO

### 14. Environment Configuration
- Production environment variables
- Secure secrets management
- Database connection strings
- Email service credentials
- Stripe keys (if using)
- **Status:** TODO
- **Current Files:**
  - `/packages/api/.env` (contains dev settings)
  - `/packages/web/.env.local`

### 15. Error Handling & User Feedback
- Consistent error messages across app
- Loading states for all async operations
- Success/failure toasts
- Graceful degradation
- **Status:** IN PROGRESS
- **Related to:** Critical Fixes 0.1, 0.2

---

## **PHASE 6: Production Deployment**

### 16. Initial Production Deployment
- Set up production environment
- Database migrations
- SSL/TLS certificates
- Monitoring/logging setup
- Beta testing with limited users
- **Status:** TODO

---

## **Current Feature Status**

### ✅ Completed Features
- Scripture references (working)
- Strong's references (working)
- Admin dashboard base metrics
- Archive/restore functionality
- Session notes & journaling
- Note count badges on history page
- Session export/print functionality
- Bible translation comparison mode
- Crisis and grief resource detection
- Question progress indicators
- Organizational structure (users, roles, permissions)

### ❌ Not Started / Incomplete
- Testing infrastructure & coverage (~0%)
- Share functionality (UI stub only)
- Counselor dashboard
- Email verification
- Password reset
- Email notifications
- Session timeout handling
- Mobile testing (deferred to beta)

---

## **Technical Debt & Known Issues**

1. Multiple background bash processes running (cleanup needed)
2. Nx cache sometimes serves stale builds
3. Debug console logs in production code (need cleanup)
4. Some TODO comments in codebase need addressing

---

## **Architecture Notes**

**Tech Stack:**
- Frontend: Next.js 15.2.5, React, TypeScript, Tailwind CSS
- Backend: NestJS, Prisma ORM
- Database: PostgreSQL
- Authentication: JWT with refresh tokens
- AI Integration: OpenAI API

**Current Ports:**
- API: 3697
- Web: 3699

**Database Schema Highlights:**
- Multi-tenancy via Organizations
- Role-based permissions
- Session sharing capability (SessionShare table)
- Archive/soft delete pattern for sessions
- Bible verse storage with Strong's numbers

---

## **Development Workflow**

1. Make code changes
2. If API changes: Kill old API server, run `npx nx reset`, restart API
3. If Web changes: Clear `.next` cache if needed, restart web server
4. Hard refresh browser (Ctrl+Shift+R)
5. Check console for errors

**Common Issues:**
- Cached builds: Use `npx nx reset` and clear `.next` folder
- Multiple servers: Kill old processes before starting new ones
- Browser cache: Always hard refresh after code changes

---

## **Next Steps**

1. **Immediate:** Fix critical bugs (0.1, 0.2)
2. **Short-term:** Complete Phase 1 core features
3. **Medium-term:** Authentication, security, testing (Phases 2-3)
4. **Long-term:** Monitoring, documentation, deployment (Phases 4-6)

---

## **Notes**

- Mobile testing will be conducted during beta phase due to locked-down dev environment
- >90% test coverage is a hard requirement before production
- Email notifications are critical - cannot launch without them
- Security review must be thorough - handling sensitive spiritual counseling data
