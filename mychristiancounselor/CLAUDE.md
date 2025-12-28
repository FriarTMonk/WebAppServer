- Clean_Restart: Stop Web & API (Node, NPM, and NX processes); Clear all cache including build; Re-Build API & Web; Start API & Web

## Authentication & User Types

**CRITICAL: There are NO anonymous users in this system.**

All users must be authenticated. The three user types are:
1. **Registered** - Basic authenticated users
2. **Subscribed** - Users with active subscriptions
3. **Organization** - Users who are members of organizations

Additionally, **Platform Admins** have elevated permissions including:
- Ability to see ALL books including those with `evaluationStatus: 'pending'`
- Ability to see books with `visibilityTier: 'not_aligned'` (hidden from regular users)
- Full oversight of evaluation system

**Important**: All API endpoints that serve user-facing content MUST require authentication using `@UseGuards(JwtAuthGuard)`. Do NOT use `@Public()` decorator for content endpoints.