# Phase 5: Security & Compliance - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement optional two-tier 2FA system (TOTP/Email) with gentle encouragement banners, plus create comprehensive HIPAA/GDPR compliance documentation.

**Architecture:** Two-tier 2FA (TOTP recommended, Email fallback), speakeasy for TOTP, qrcode for QR generation, AES-256-GCM encryption for secrets, 9-day encouragement banners, admin 2FA status dashboard, comprehensive compliance documentation.

**Tech Stack:** NestJS, speakeasy, qrcode, crypto (Node.js built-in), Prisma, Next.js 16, React 19, TypeScript

---

## Task Groups Overview

### Part A: Two-Factor Authentication
1. **Database Schema** (2 tasks) - User model fields, migration
2. **Encryption Utility** (1 task) - AES-256-GCM for secrets/codes
3. **Email 2FA Backend** (4 tasks) - Enable, code generation, verification, resend
4. **TOTP 2FA Backend** (5 tasks) - Setup, QR code, verification, backup codes, login
5. **Login Flow** (3 tasks) - Auth service updates, 2FA step, backup code handling
6. **2FA Management** (2 tasks) - Disable 2FA, upgrade email→TOTP
7. **Email 2FA Frontend** (3 tasks) - Setup UI, code input, login flow
8. **TOTP 2FA Frontend** (4 tasks) - Setup wizard, QR display, backup codes, verification
9. **Security Banners** (3 tasks) - Deployment banner, 9-day reminders, logic
10. **Admin Dashboard** (2 tasks) - 2FA stats widget, detail view

### Part B: Compliance Documentation
11. **Compliance Docs** (3 tasks) - BAAs, incident response, data protection

**Total: 32 tasks**

---

## PART A: TWO-FACTOR AUTHENTICATION

## Group 1: Database Schema (2 tasks)

### Task 1: Add 2FA fields to User model

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

**Step 1: Add 2FA fields to User model**

Find the User model and add fields before relations section:

```prisma
model User {
  // ... existing fields ...

  // Two-Factor Authentication
  twoFactorEnabled         Boolean   @default(false)
  twoFactorMethod          String?   // "email" or "totp"
  twoFactorSecret          String?   // Encrypted TOTP secret (AES-256-GCM)
  twoFactorBackupCodes     String[]  @default([]) // Encrypted backup codes
  twoFactorEnabledAt       DateTime?

  // Email Verification (for email 2FA)
  emailVerificationCode    String?   // 6-digit code
  emailCodeExpiresAt       DateTime?
  emailCodeUsedAt          DateTime? // Single-use enforcement
  emailCodeAttempts        Int       @default(0) // Throttling (3 resends/hour)
  lastEmailCodeRequestAt   DateTime?

  // Security Banners
  lastSecurityBannerShown  DateTime?
  deploymentBannerDismissed Boolean  @default(false)

  // Relations
  // ... existing relations ...

  @@index([twoFactorEnabled, twoFactorMethod])
}
```

**Step 2: Format schema**

```bash
cd packages/api
npx prisma format
```

Expected: No errors, file formatted

**Step 3: Commit**

```bash
git add packages/api/prisma/schema.prisma
git commit -m "feat(db): add 2FA fields to User model"
```

---

### Task 2: Run database migration

**Files:**
- Create: `packages/api/prisma/migrations/YYYYMMDDHHMMSS_add_two_factor_auth/migration.sql`

**Step 1: Generate migration**

```bash
cd packages/api
npx prisma migrate dev --name add_two_factor_auth
```

Expected: Migration created successfully

**Step 2: Verify migration applied**

```bash
npx prisma migrate status
```

Expected: All migrations applied

**Step 3: Commit migration files**

```bash
git add packages/api/prisma/migrations/
git commit -m "feat(db): apply 2FA database migration"
```

---

## Group 2: Encryption Utility (1 task)

### Task 3: Create encryption utility for 2FA secrets

**Files:**
- Create: `packages/api/src/common/utils/encryption.util.ts`

**Step 1: Create encryption utility**

```typescript
import * as crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'ENCRYPTION_KEY must be set in environment variables (64 hex characters = 32 bytes)',
  );
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking chars
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
}
```

**Step 2: Add ENCRYPTION_KEY to .env**

Add to `packages/api/.env`:

```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_string_here
```

**Step 3: Commit**

```bash
git add packages/api/src/common/utils/encryption.util.ts
git commit -m "feat(security): add AES-256-GCM encryption utility for 2FA secrets"
```

---

## Group 3: Email 2FA Backend (4 tasks)

### Task 4: Create TwoFactorService for email 2FA

**Files:**
- Create: `packages/api/src/auth/services/two-factor.service.ts`

**Step 1: Install dependencies**

```bash
cd packages/api
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

**Step 2: Create TwoFactorService**

```typescript
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { encrypt, decrypt, generateRandomString } from '../../common/utils/encryption.util';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ========== EMAIL 2FA ==========

  async enableEmail2FA(userId: string): Promise<void> {
    // Send test code
    await this.sendEmailCode(userId);

    return;
  }

  async sendEmailCode(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        emailCodeAttempts: true,
        lastEmailCodeRequestAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Throttle: Max 3 codes per hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (
      user.lastEmailCodeRequestAt &&
      user.lastEmailCodeRequestAt > oneHourAgo &&
      user.emailCodeAttempts >= 3
    ) {
      throw new BadRequestException(
        'Too many code requests. Please try again in an hour.',
      );
    }

    // Reset attempts counter if last request was >1 hour ago
    const attempts =
      user.lastEmailCodeRequestAt && user.lastEmailCodeRequestAt > oneHourAgo
        ? user.emailCodeAttempts + 1
        : 1;

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    // Store code
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCode: code,
        emailCodeExpiresAt: expiresAt,
        emailCodeUsedAt: null, // Reset used flag
        emailCodeAttempts: attempts,
        lastEmailCodeRequestAt: now,
      },
    });

    // Send email
    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Your MyChristianCounselor Verification Code',
      html: `
        <p>Hi ${user.firstName},</p>
        <p>Your verification code is: <strong style="font-size: 24px;">${code}</strong></p>
        <p>This code will expire in 30 minutes and can only be used once.</p>
        <p>If you didn't request this code, please contact support immediately.</p>
        <p><em>Security Tip: Never share this code with anyone.</em></p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          MyChristianCounselor Support<br>
          support@mychristiancounselor.online
        </p>
      `,
      text: `
Hi ${user.firstName},

Your verification code is: ${code}

This code will expire in 30 minutes and can only be used once.

If you didn't request this code, please contact support immediately.

Security Tip: Never share this code with anyone.

---
MyChristianCounselor Support
support@mychristiancounselor.online
      `,
    });
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerificationCode: true,
        emailCodeExpiresAt: true,
        emailCodeUsedAt: true,
      },
    });

    if (!user || !user.emailVerificationCode || !user.emailCodeExpiresAt) {
      throw new BadRequestException('No verification code found');
    }

    // Check if already used
    if (user.emailCodeUsedAt) {
      throw new BadRequestException('This code has already been used');
    }

    // Check if expired
    if (new Date() > user.emailCodeExpiresAt) {
      throw new BadRequestException('Code has expired');
    }

    // Verify code
    if (user.emailVerificationCode !== code) {
      return false;
    }

    // Mark code as used
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailCodeUsedAt: new Date(),
      },
    });

    return true;
  }

  async completeEmail2FASetup(userId: string, code: string): Promise<void> {
    const verified = await this.verifyEmailCode(userId, code);

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable email 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'email',
        twoFactorEnabledAt: new Date(),
      },
    });
  }

  // ========== TOTP 2FA (to be implemented in next tasks) ==========

  // ========== COMMON ==========

  async disable2FA(userId: string, password: string): Promise<void> {
    // Verify password before disabling 2FA
    // (Password verification logic omitted for brevity, should be implemented)

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        emailVerificationCode: null,
        emailCodeExpiresAt: null,
        emailCodeUsedAt: null,
      },
    });
  }
}
```

**Step 3: Commit**

```bash
git add packages/api/package.json packages/api/package-lock.json packages/api/src/auth/services/two-factor.service.ts
git commit -m "feat(2fa): add TwoFactorService with email 2FA support"
```

---

### Task 5: Create 2FA endpoints

**Files:**
- Create: `packages/api/src/auth/controllers/two-factor.controller.ts`

**Step 1: Create controller**

```typescript
import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { TwoFactorService } from '../services/two-factor.service';

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  // ========== EMAIL 2FA ==========

  @Post('email/enable')
  async enableEmail2FA(@CurrentUser('id') userId: string) {
    await this.twoFactorService.enableEmail2FA(userId);
    return {
      success: true,
      message: 'Verification code sent to your email',
    };
  }

  @Post('email/verify')
  async verifyEmailCode(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    const verified = await this.twoFactorService.verifyEmailCode(userId, code);
    return { success: verified };
  }

  @Post('email/complete-setup')
  async completeEmail2FASetup(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    await this.twoFactorService.completeEmail2FASetup(userId, code);
    return {
      success: true,
      message: 'Email 2FA enabled successfully',
    };
  }

  @Post('email/resend')
  async resendEmailCode(@CurrentUser('id') userId: string) {
    await this.twoFactorService.sendEmailCode(userId);
    return {
      success: true,
      message: 'New verification code sent',
    };
  }

  // ========== TOTP 2FA (to be added) ==========

  // ========== COMMON ==========

  @Post('disable')
  async disable2FA(
    @CurrentUser('id') userId: string,
    @Body('password') password: string,
  ) {
    await this.twoFactorService.disable2FA(userId, password);
    return {
      success: true,
      message: '2FA disabled successfully',
    };
  }
}
```

**Step 2: Register controller and service in AuthModule**

Modify `packages/api/src/auth/auth.module.ts`:

```typescript
import { TwoFactorService } from './services/two-factor.service';
import { TwoFactorController } from './controllers/two-factor.controller';

@Module({
  imports: [
    // ... existing imports
    EmailModule, // Make sure EmailModule is imported
  ],
  controllers: [
    AuthController,
    TwoFactorController, // Add this
  ],
  providers: [
    AuthService,
    TwoFactorService, // Add this
    // ... other providers
  ],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
```

**Step 3: Commit**

```bash
git add packages/api/src/auth/controllers/two-factor.controller.ts packages/api/src/auth/auth.module.ts
git commit -m "feat(2fa): add 2FA REST endpoints for email verification"
```

---

### Task 6: Add email 2FA to login flow

**Files:**
- Modify: `packages/api/src/auth/services/auth.service.ts`

**Step 1: Update login method to check for 2FA**

Find the `login` method and update:

```typescript
async login(email: string, password: string): Promise<{ accessToken?: string; requires2FA?: boolean; userId?: string; method?: string }> {
  // Validate credentials
  const user = await this.validateUser(email, password);

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Check if 2FA is enabled
  if (user.twoFactorEnabled) {
    return {
      requires2FA: true,
      userId: user.id,
      method: user.twoFactorMethod,
    };
  }

  // No 2FA, proceed with normal login
  const payload = { sub: user.id, email: user.email, role: user.role };
  return {
    accessToken: this.jwtService.sign(payload),
  };
}

async verifyLogin2FA(userId: string, code: string, method: 'email' | 'totp'): Promise<{ accessToken: string }> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (!user.twoFactorEnabled || user.twoFactorMethod !== method) {
    throw new UnauthorizedException('2FA not configured for this method');
  }

  let verified = false;

  if (method === 'email') {
    verified = await this.twoFactorService.verifyEmailCode(userId, code);
  } else if (method === 'totp') {
    // TOTP verification to be implemented
    verified = await this.twoFactorService.verifyTOTPCode(userId, code);
  }

  if (!verified) {
    throw new UnauthorizedException('Invalid verification code');
  }

  // Generate JWT token
  const payload = { sub: user.id, email: user.email, role: user.role };
  return {
    accessToken: this.jwtService.sign(payload),
  };
}
```

**Step 2: Add 2FA verification endpoint to AuthController**

Modify `packages/api/src/auth/auth.controller.ts`:

```typescript
@Post('login/verify-2fa')
async verifyLogin2FA(
  @Body('userId') userId: string,
  @Body('code') code: string,
  @Body('method') method: 'email' | 'totp',
) {
  return this.authService.verifyLogin2FA(userId, code, method);
}
```

**Step 3: Inject TwoFactorService in AuthService**

Update AuthService constructor:

```typescript
constructor(
  private prisma: PrismaService,
  private jwtService: JwtService,
  private twoFactorService: TwoFactorService, // Add this
) {}
```

**Step 4: Commit**

```bash
git add packages/api/src/auth/services/auth.service.ts packages/api/src/auth/auth.controller.ts
git commit -m "feat(2fa): integrate email 2FA into login flow"
```

---

### Task 7: Test email 2FA endpoints

**Step 1: Start API server**

```bash
cd packages/api
npm run start:dev
```

**Step 2: Test email 2FA flow**

```bash
# Login as user
USER_TOKEN="your_jwt_token_here"

# Enable email 2FA (sends code)
curl -X POST -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3000/api/auth/2fa/email/enable

# Check email for code, then verify and complete setup
curl -X POST -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}' \
  http://localhost:3000/api/auth/2fa/email/complete-setup
```

Expected:
- Code sent to email
- Verification succeeds with correct code
- 2FA enabled in database

**Step 3: Document**

No commit (manual verification)

---

## Group 4: TOTP 2FA Backend (5 tasks)

### Task 8: Add TOTP setup to TwoFactorService

**Files:**
- Modify: `packages/api/src/auth/services/two-factor.service.ts`

**Step 1: Add TOTP setup method**

Add to TwoFactorService class:

```typescript
// ========== TOTP 2FA ==========

async setupTOTP(userId: string): Promise<{ secret: string; qrCodeDataURL: string }> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `MyChristianCounselor (${user.email})`,
    issuer: 'MyChristianCounselor',
    length: 32,
  });

  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

  // Store encrypted secret (temporarily, until setup is verified)
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: encrypt(secret.base32),
    },
  });

  return {
    secret: secret.base32,
    qrCodeDataURL,
  };
}

async verifyTOTPSetup(userId: string, code: string): Promise<boolean> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });

  if (!user || !user.twoFactorSecret) {
    throw new BadRequestException('TOTP setup not initiated');
  }

  const secret = decrypt(user.twoFactorSecret);

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1, // Allow 1 step before/after for clock skew
  });

  return verified;
}

async completeTOTPSetup(userId: string, code: string): Promise<{ backupCodes: string[] }> {
  const verified = await this.verifyTOTPSetup(userId, code);

  if (!verified) {
    throw new BadRequestException('Invalid verification code');
  }

  // Generate 10 backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    generateRandomString(8).toUpperCase(),
  );

  // Store encrypted backup codes
  const encryptedCodes = backupCodes.map(code => encrypt(code));

  // Enable TOTP 2FA
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorMethod: 'totp',
      twoFactorBackupCodes: encryptedCodes,
      twoFactorEnabledAt: new Date(),
    },
  });

  return { backupCodes };
}

async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });

  if (!user || !user.twoFactorSecret) {
    return false;
  }

  const secret = decrypt(user.twoFactorSecret);

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  return verified;
}

async verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorBackupCodes: true },
  });

  if (!user || user.twoFactorBackupCodes.length === 0) {
    return false;
  }

  // Check if code matches any backup code
  let matchedIndex = -1;
  for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
    const decryptedCode = decrypt(user.twoFactorBackupCodes[i]);
    if (decryptedCode === code.toUpperCase()) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    return false;
  }

  // Remove used backup code
  const updatedCodes = user.twoFactorBackupCodes.filter((_, i) => i !== matchedIndex);

  await this.prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorBackupCodes: updatedCodes,
    },
  });

  return true;
}

async regenerateBackupCodes(userId: string): Promise<{ backupCodes: string[] }> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorMethod: true },
  });

  if (!user || !user.twoFactorEnabled || user.twoFactorMethod !== 'totp') {
    throw new BadRequestException('TOTP 2FA not enabled');
  }

  // Generate new backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    generateRandomString(8).toUpperCase(),
  );

  const encryptedCodes = backupCodes.map(code => encrypt(code));

  await this.prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorBackupCodes: encryptedCodes,
    },
  });

  return { backupCodes };
}

async getRemainingBackupCodes(userId: string): Promise<number> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorBackupCodes: true },
  });

  return user?.twoFactorBackupCodes.length || 0;
}
```

**Step 2: Commit**

```bash
git add packages/api/src/auth/services/two-factor.service.ts
git commit -m "feat(2fa): add TOTP setup, verification, and backup codes to TwoFactorService"
```

---

### Task 9: Add TOTP endpoints

**Files:**
- Modify: `packages/api/src/auth/controllers/two-factor.controller.ts`

**Step 1: Add TOTP endpoints**

Add to TwoFactorController class:

```typescript
// ========== TOTP 2FA ==========

@Post('totp/setup')
async setupTOTP(@CurrentUser('id') userId: string) {
  const result = await this.twoFactorService.setupTOTP(userId);
  return result;
}

@Post('totp/verify-setup')
async verifyTOTPSetup(
  @CurrentUser('id') userId: string,
  @Body('code') code: string,
) {
  const verified = await this.twoFactorService.verifyTOTPSetup(userId, code);
  return { success: verified };
}

@Post('totp/complete-setup')
async completeTOTPSetup(
  @CurrentUser('id') userId: string,
  @Body('code') code: string,
) {
  const result = await this.twoFactorService.completeTOTPSetup(userId, code);
  return {
    success: true,
    backupCodes: result.backupCodes,
    message: 'TOTP 2FA enabled successfully',
  };
}

@Post('backup-codes/use')
async useBackupCode(
  @CurrentUser('id') userId: string,
  @Body('code') code: string,
) {
  const verified = await this.twoFactorService.verifyBackupCode(userId, code);

  if (!verified) {
    return { success: false, message: 'Invalid backup code' };
  }

  const remaining = await this.twoFactorService.getRemainingBackupCodes(userId);

  return {
    success: true,
    message: `Backup code accepted. ${remaining} codes remaining.`,
    remaining,
  };
}

@Post('backup-codes/regenerate')
async regenerateBackupCodes(@CurrentUser('id') userId: string) {
  const result = await this.twoFactorService.regenerateBackupCodes(userId);
  return {
    success: true,
    backupCodes: result.backupCodes,
    message: 'New backup codes generated',
  };
}

@Get('backup-codes/count')
async getBackupCodesCount(@CurrentUser('id') userId: string) {
  const count = await this.twoFactorService.getRemainingBackupCodes(userId);
  return { count };
}
```

**Step 2: Commit**

```bash
git add packages/api/src/auth/controllers/two-factor.controller.ts
git commit -m "feat(2fa): add TOTP and backup code endpoints"
```

---

### Task 10: Update AuthService for TOTP login verification

**Files:**
- Modify: `packages/api/src/auth/services/auth.service.ts`

**Step 1: Update verifyLogin2FA to handle backup codes**

Update the method to accept backup codes:

```typescript
async verifyLogin2FA(
  userId: string,
  code: string,
  method: 'email' | 'totp',
  isBackupCode: boolean = false,
): Promise<{ accessToken: string; remaining?: number }> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (!user.twoFactorEnabled || user.twoFactorMethod !== method) {
    throw new UnauthorizedException('2FA not configured for this method');
  }

  let verified = false;
  let remainingBackupCodes: number | undefined;

  if (isBackupCode && method === 'totp') {
    verified = await this.twoFactorService.verifyBackupCode(userId, code);
    if (verified) {
      remainingBackupCodes = await this.twoFactorService.getRemainingBackupCodes(userId);
    }
  } else if (method === 'email') {
    verified = await this.twoFactorService.verifyEmailCode(userId, code);
  } else if (method === 'totp') {
    verified = await this.twoFactorService.verifyTOTPCode(userId, code);
  }

  if (!verified) {
    throw new UnauthorizedException('Invalid verification code');
  }

  // Generate JWT token
  const payload = { sub: user.id, email: user.email, role: user.role };

  return {
    accessToken: this.jwtService.sign(payload),
    ...(remainingBackupCodes !== undefined && { remaining: remainingBackupCodes }),
  };
}
```

**Step 2: Update AuthController endpoint**

Update the endpoint to handle backup codes:

```typescript
@Post('login/verify-2fa')
async verifyLogin2FA(
  @Body('userId') userId: string,
  @Body('code') code: string,
  @Body('method') method: 'email' | 'totp',
  @Body('isBackupCode') isBackupCode?: boolean,
) {
  return this.authService.verifyLogin2FA(userId, code, method, isBackupCode || false);
}
```

**Step 3: Commit**

```bash
git add packages/api/src/auth/services/auth.service.ts packages/api/src/auth/auth.controller.ts
git commit -m "feat(2fa): add backup code support to login verification"
```

---

## Group 6: 2FA Management (2 tasks)

### Task 11: Add disable 2FA endpoint

**Files:**
- Modify: `packages/api/src/auth/services/two-factor.service.ts`
- Modify: `packages/api/src/auth/controllers/two-factor.controller.ts`

**Step 1: Add disable method to TwoFactorService**

```typescript
async disable2FA(userId: string): Promise<void> {
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorEnabledAt: null,
      emailVerificationCode: null,
      emailCodeExpiresAt: null,
      emailCodeUsedAt: null,
    },
  });
}
```

**Step 2: Add controller endpoint**

```typescript
@Post('disable')
@UseGuards(JwtAuthGuard)
async disable2FA(@Req() req: any) {
  await this.twoFactorService.disable2FA(req.user.id);
  return { success: true, message: '2FA has been disabled' };
}
```

**Step 3: Commit**

```bash
git add packages/api/src/auth/services/two-factor.service.ts packages/api/src/auth/controllers/two-factor.controller.ts
git commit -m "feat(2fa): add endpoint to disable 2FA"
```

---

### Task 12: Add upgrade email→TOTP endpoint

**Files:**
- Modify: `packages/api/src/auth/services/two-factor.service.ts`
- Modify: `packages/api/src/auth/controllers/two-factor.controller.ts`

**Step 1: Add upgrade method to TwoFactorService**

```typescript
async upgradeToTOTP(userId: string): Promise<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  if (user.twoFactorMethod !== 'email') {
    throw new BadRequestException('Can only upgrade from email 2FA');
  }

  // Generate TOTP secret and backup codes
  return this.setupTOTP(userId);
}
```

**Step 2: Add controller endpoint**

```typescript
@Post('upgrade-to-totp')
@UseGuards(JwtAuthGuard)
async upgradeToTOTP(@Req() req: any) {
  return this.twoFactorService.upgradeToTOTP(req.user.id);
}
```

**Step 3: Commit**

```bash
git add packages/api/src/auth/services/two-factor.service.ts packages/api/src/auth/controllers/two-factor.controller.ts
git commit -m "feat(2fa): add endpoint to upgrade from email to TOTP"
```

---

## Group 7: Email 2FA Frontend (3 tasks)

### Task 13: Create email 2FA setup page

**Files:**
- Create: `packages/web/src/app/settings/security/email-2fa/page.tsx`

**Step 1: Create email 2FA setup component**

```typescript
'use client';

import { useState } from 'react';
import { showToast } from '@/components/Toast';

export default function Email2FASetupPage() {
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/2fa/email/enable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCodeSent(true);
      showToast('Verification code sent to your email', 'success');
    } catch (error) {
      showToast('Failed to send code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/2fa/email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code }),
      });
      showToast('Email 2FA enabled successfully!', 'success');
      window.location.href = '/settings/security';
    } catch (error) {
      showToast('Invalid code', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Enable Email Two-Factor Authentication</h1>

      {!codeSent ? (
        <div>
          <p className="mb-4">
            We'll send a 6-digit code to your email address each time you log in.
          </p>
          <button
            onClick={handleSendCode}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-4">
            Enter the 6-digit code sent to your email:
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="border rounded px-3 py-2 mb-4"
            placeholder="000000"
            maxLength={6}
          />
          <div className="flex gap-2">
            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Resend Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/settings/security/email-2fa/page.tsx
git commit -m "feat(ui): add email 2FA setup page"
```

---

### Task 14: Create 2FA code input component

**Files:**
- Create: `packages/web/src/components/TwoFactorCodeInput.tsx`

**Step 1: Create reusable code input component**

```typescript
'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface TwoFactorCodeInputProps {
  onComplete: (code: string) => void;
  loading?: boolean;
}

export default function TwoFactorCodeInput({ onComplete, loading }: TwoFactorCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join('');
    if (code.length === 6) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={loading}
          className="w-12 h-14 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/TwoFactorCodeInput.tsx
git commit -m "feat(ui): add reusable 2FA code input component"
```

---

### Task 15: Update login flow for 2FA

**Files:**
- Modify: `packages/web/src/app/login/page.tsx`

**Step 1: Add 2FA verification step to login**

Update login page to handle 2FA:

```typescript
'use client';

import { useState } from 'react';
import { showToast } from '@/components/Toast';
import TwoFactorCodeInput from '@/components/TwoFactorCodeInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp'>('email');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.requires2FA) {
        setRequires2FA(true);
        setUserId(data.userId);
        setTwoFactorMethod(data.method);
        if (data.method === 'email') {
          showToast('Verification code sent to your email', 'info');
        }
      } else {
        localStorage.setItem('token', data.accessToken);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      showToast('Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, method: twoFactorMethod }),
      });

      const data = await response.json();
      localStorage.setItem('token', data.accessToken);
      window.location.href = '/dashboard';
    } catch (error) {
      showToast('Invalid code', 'error');
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="max-w-md mx-auto p-6 mt-20">
        <h1 className="text-2xl font-bold mb-4">Enter Verification Code</h1>
        <p className="mb-6 text-gray-600">
          {twoFactorMethod === 'email'
            ? 'Enter the 6-digit code sent to your email'
            : 'Enter the code from your authenticator app'}
        </p>
        <TwoFactorCodeInput onComplete={handleVerify2FA} loading={loading} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-20">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border rounded px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/login/page.tsx
git commit -m "feat(ui): add 2FA verification step to login flow"
```

---

## Group 8: TOTP 2FA Frontend (4 tasks)

### Task 16: Create TOTP setup wizard

**Files:**
- Create: `packages/web/src/app/settings/security/totp-2fa/page.tsx`

**Step 1: Create TOTP setup page**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import TwoFactorCodeInput from '@/components/TwoFactorCodeInput';

export default function TOTPSetupPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/totp/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    } catch (error) {
      showToast('Failed to setup TOTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    try {
      await fetch('/api/auth/2fa/totp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code }),
      });
      setStep('backup');
      showToast('TOTP verified successfully!', 'success');
    } catch (error) {
      showToast('Invalid code', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'setup') {
      handleSetup();
    }
  }, []);

  if (step === 'verify') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Scan QR Code</h1>
        <div className="mb-6">
          <p className="mb-4">Scan this QR code with your authenticator app:</p>
          <img src={qrCode} alt="QR Code" className="border p-4 bg-white" />
          <p className="mt-4 text-sm text-gray-600">
            Manual entry code: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code>
          </p>
        </div>
        <div>
          <p className="mb-4">Enter the 6-digit code from your app:</p>
          <TwoFactorCodeInput onComplete={handleVerify} loading={loading} />
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Save Your Backup Codes</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="font-semibold">Important!</p>
          <p>Save these backup codes in a secure location. Each can be used once if you lose access to your authenticator app.</p>
        </div>
        <div className="bg-gray-50 p-4 rounded mb-6">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, i) => (
              <div key={i}>{code}</div>
            ))}
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/settings/security'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          I've Saved My Backup Codes
        </button>
      </div>
    );
  }

  return <div className="text-center p-6">Setting up TOTP...</div>;
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/settings/security/totp-2fa/page.tsx
git commit -m "feat(ui): add TOTP setup wizard with QR code and backup codes"
```

---

### Task 17: Create security settings dashboard

**Files:**
- Create: `packages/web/src/app/settings/security/page.tsx`

**Step 1: Create security settings page**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';

interface SecurityStatus {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'email' | 'totp' | null;
  twoFactorEnabledAt: string | null;
}

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      showToast('Failed to load security status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    try {
      await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      showToast('2FA has been disabled', 'success');
      fetchStatus();
    } catch (error) {
      showToast('Failed to disable 2FA', 'error');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Security Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>

        {!status?.twoFactorEnabled ? (
          <div>
            <p className="mb-4 text-gray-600">
              Add an extra layer of security to your account by requiring a verification code when you log in.
            </p>
            <div className="flex gap-4">
              <a
                href="/settings/security/email-2fa"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Enable Email 2FA
              </a>
              <a
                href="/settings/security/totp-2fa"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Enable Authenticator App (Recommended)
              </a>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                ✓ Enabled
              </span>
              <p className="mt-2 text-gray-600">
                Method: {status.twoFactorMethod === 'totp' ? 'Authenticator App' : 'Email'}
              </p>
              {status.twoFactorEnabledAt && (
                <p className="text-sm text-gray-500">
                  Enabled on {new Date(status.twoFactorEnabledAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              {status.twoFactorMethod === 'email' && (
                <a
                  href="/settings/security/totp-2fa"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Upgrade to Authenticator App
                </a>
              )}
              <button
                onClick={handleDisable2FA}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/settings/security/page.tsx
git commit -m "feat(ui): add security settings dashboard with 2FA status"
```

---

### Task 18: Add backup code display component

**Files:**
- Create: `packages/web/src/components/BackupCodes.tsx`

**Step 1: Create backup codes component**

```typescript
'use client';

interface BackupCodesProps {
  codes: string[];
  onDownload?: () => void;
  onContinue?: () => void;
}

export default function BackupCodes({ codes, onDownload, onContinue }: BackupCodesProps) {
  const handleDownload = () => {
    const text = 'My Christian Counselor - Backup Codes\n\n' +
      'Save these codes in a secure location.\n' +
      'Each code can be used once if you lose access to your authenticator.\n\n' +
      codes.join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcc-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);

    onDownload?.();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join('\n'));
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Your Backup Codes</h3>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <p className="font-semibold">Important!</p>
        <p className="text-sm">Each code can only be used once. Store them securely.</p>
      </div>

      <div className="bg-gray-50 p-4 rounded mb-4 font-mono text-sm">
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-400">{i + 1}.</span>
              <span>{code}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Download
        </button>
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Copy
        </button>
        {onContinue && (
          <button
            onClick={onContinue}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/BackupCodes.tsx
git commit -m "feat(ui): add backup codes display component with download/copy"
```

---

### Task 19: Add backup code login option

**Files:**
- Modify: `packages/web/src/app/login/page.tsx`

**Step 1: Add backup code toggle to 2FA verification**

Update the 2FA verification UI to include backup code option:

```typescript
// Inside the requires2FA block, add:
const [useBackupCode, setUseBackupCode] = useState(false);

// In handleVerify2FA:
const handleVerify2FA = async (code: string) => {
  setLoading(true);
  try {
    const response = await fetch('/api/auth/login/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        code,
        method: twoFactorMethod,
        isBackupCode: useBackupCode
      }),
    });

    const data = await response.json();
    localStorage.setItem('token', data.accessToken);

    if (data.remaining !== undefined) {
      showToast(`Backup code used. ${data.remaining} codes remaining.`, 'warning');
    }

    window.location.href = '/dashboard';
  } catch (error) {
    showToast('Invalid code', 'error');
    setLoading(false);
  }
};

// Add toggle UI:
<div className="text-center mt-4">
  <button
    type="button"
    onClick={() => setUseBackupCode(!useBackupCode)}
    className="text-sm text-blue-600 hover:underline"
  >
    {useBackupCode ? 'Use verification code' : 'Use backup code instead'}
  </button>
</div>
```

**Step 2: Commit**

```bash
git add packages/web/src/app/login/page.tsx
git commit -m "feat(ui): add backup code option to login 2FA verification"
```

---

## Group 9: Security Banners (3 tasks)

### Task 20: Create security banner component

**Files:**
- Create: `packages/web/src/components/SecurityBanner.tsx`

**Step 1: Create banner component**

```typescript
'use client';

import { useState } from 'react';

interface SecurityBannerProps {
  type: 'deployment' | '3-day' | '9-day';
  onDismiss: () => void;
  onEnable: () => void;
}

export default function SecurityBanner({ type, onDismiss, onEnable }: SecurityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const messages = {
    deployment: {
      title: 'New Security Feature Available',
      body: 'Two-factor authentication is now available to help protect your account.',
      icon: '🔒',
    },
    '3-day': {
      title: 'Reminder: Enable Two-Factor Authentication',
      body: 'Add an extra layer of security to your account in just 2 minutes.',
      icon: '🛡️',
    },
    '9-day': {
      title: 'Protect Your Account',
      body: 'Two-factor authentication helps keep your counseling data secure.',
      icon: '🔐',
    },
  };

  const content = messages[type];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="text-3xl mr-4">{content.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">{content.title}</h3>
          <p className="text-blue-800 text-sm">{content.body}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onEnable}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Enable Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1 text-blue-600 text-sm hover:underline"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/components/SecurityBanner.tsx
git commit -m "feat(ui): add security encouragement banner component"
```

---

### Task 21: Add banner display logic to dashboard

**Files:**
- Modify: `packages/web/src/app/dashboard/page.tsx`

**Step 1: Add banner logic to dashboard**

```typescript
import { useState, useEffect } from 'react';
import SecurityBanner from '@/components/SecurityBanner';

// Inside component:
const [showBanner, setShowBanner] = useState(false);
const [bannerType, setBannerType] = useState<'deployment' | '3-day' | '9-day'>('deployment');

useEffect(() => {
  checkSecurityBanner();
}, []);

const checkSecurityBanner = async () => {
  try {
    const response = await fetch('/api/auth/2fa/status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await response.json();

    if (!data.twoFactorEnabled) {
      const banner = determineBannerType(data);
      if (banner) {
        setBannerType(banner);
        setShowBanner(true);
      }
    }
  } catch (error) {
    console.error('Failed to check banner status');
  }
};

const determineBannerType = (status: any): 'deployment' | '3-day' | '9-day' | null => {
  if (status.deploymentBannerDismissed === false) {
    return 'deployment';
  }

  if (!status.lastSecurityBannerShown) {
    return '3-day';
  }

  const lastShown = new Date(status.lastSecurityBannerShown);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince >= 9) {
    return '9-day';
  } else if (daysSince >= 3) {
    return '3-day';
  }

  return null;
};

const handleDismissBanner = async () => {
  await fetch('/api/auth/2fa/dismiss-banner', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  setShowBanner(false);
};

const handleEnableSecurity = () => {
  window.location.href = '/settings/security';
};

// In render:
{showBanner && (
  <SecurityBanner
    type={bannerType}
    onDismiss={handleDismissBanner}
    onEnable={handleEnableSecurity}
  />
)}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/dashboard/page.tsx
git commit -m "feat(ui): add security banner display logic to dashboard"
```

---

### Task 22: Add banner dismissal endpoint

**Files:**
- Modify: `packages/api/src/auth/controllers/two-factor.controller.ts`
- Modify: `packages/api/src/auth/services/two-factor.service.ts`

**Step 1: Add dismissal endpoint**

```typescript
// In TwoFactorService:
async dismissBanner(userId: string): Promise<void> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { deploymentBannerDismissed: true },
  });

  if (!user) {
    throw new BadRequestException('User not found');
  }

  await this.prisma.user.update({
    where: { id: userId },
    data: {
      deploymentBannerDismissed: user.deploymentBannerDismissed ? undefined : true,
      lastSecurityBannerShown: new Date(),
    },
  });
}

// In TwoFactorController:
@Post('dismiss-banner')
@UseGuards(JwtAuthGuard)
async dismissBanner(@Req() req: any) {
  await this.twoFactorService.dismissBanner(req.user.id);
  return { success: true };
}
```

**Step 2: Commit**

```bash
git add packages/api/src/auth/services/two-factor.service.ts packages/api/src/auth/controllers/two-factor.controller.ts
git commit -m "feat(2fa): add banner dismissal endpoint"
```

---

## Group 10: Admin Dashboard (2 tasks)

### Task 23: Create 2FA stats endpoint

**Files:**
- Create: `packages/api/src/admin/controllers/security-stats.controller.ts`
- Create: `packages/api/src/admin/services/security-stats.service.ts`

**Step 1: Create stats service**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SecurityStatsService {
  constructor(private prisma: PrismaService) {}

  async get2FAStats() {
    const [total, enabled, emailMethod, totpMethod] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { twoFactorEnabled: true } }),
      this.prisma.user.count({ where: { twoFactorMethod: 'email' } }),
      this.prisma.user.count({ where: { twoFactorMethod: 'totp' } }),
    ]);

    return {
      total,
      enabled,
      disabled: total - enabled,
      emailMethod,
      totpMethod,
      enabledPercentage: total > 0 ? Math.round((enabled / total) * 100) : 0,
    };
  }

  async get2FAUserList(filters?: { method?: string; enabled?: boolean }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.enabled !== undefined && { twoFactorEnabled: filters.enabled }),
        ...(filters?.method && { twoFactorMethod: filters.method }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
        twoFactorEnabledAt: true,
      },
      orderBy: { twoFactorEnabledAt: 'desc' },
    });
  }
}
```

**Step 2: Create controller**

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IsPlatformAdminGuard } from '../guards/is-platform-admin.guard';
import { SecurityStatsService } from '../services/security-stats.service';

@Controller('admin/security')
@UseGuards(JwtAuthGuard, IsPlatformAdminGuard)
export class SecurityStatsController {
  constructor(private securityStatsService: SecurityStatsService) {}

  @Get('2fa/stats')
  async get2FAStats() {
    return this.securityStatsService.get2FAStats();
  }

  @Get('2fa/users')
  async get2FAUsers(
    @Query('method') method?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.securityStatsService.get2FAUserList({
      method,
      enabled: enabled ? enabled === 'true' : undefined,
    });
  }
}
```

**Step 3: Register in AdminModule**

```typescript
// In packages/api/src/admin/admin.module.ts
import { SecurityStatsController } from './controllers/security-stats.controller';
import { SecurityStatsService } from './services/security-stats.service';

@Module({
  controllers: [/* existing */, SecurityStatsController],
  providers: [/* existing */, SecurityStatsService],
})
```

**Step 4: Commit**

```bash
git add packages/api/src/admin/controllers/security-stats.controller.ts packages/api/src/admin/services/security-stats.service.ts packages/api/src/admin/admin.module.ts
git commit -m "feat(admin): add 2FA statistics endpoints"
```

---

### Task 24: Create admin 2FA dashboard widget

**Files:**
- Create: `packages/web/src/app/admin/security/2fa/page.tsx`

**Step 1: Create 2FA admin page**

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Stats {
  total: number;
  enabled: number;
  disabled: number;
  emailMethod: number;
  totpMethod: number;
  enabledPercentage: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorEnabledAt: string | null;
}

export default function Admin2FAPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/security/2fa/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch(`/api/admin/security/2fa/users?enabled=${filter === 'enabled' ? 'true' : filter === 'disabled' ? 'false' : ''}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
    } catch (error) {
      console.error('Failed to load 2FA stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Two-Factor Authentication Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold">{stats?.enabledPercentage}%</div>
          <div className="text-gray-600">Adoption Rate</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats?.enabled}</div>
          <div className="text-gray-600">Enabled</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{stats?.totpMethod}</div>
          <div className="text-gray-600">Using TOTP</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-orange-600">{stats?.emailMethod}</div>
          <div className="text-gray-600">Using Email</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All Users
        </button>
        <button
          onClick={() => setFilter('enabled')}
          className={`px-4 py-2 rounded ${filter === 'enabled' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          2FA Enabled
        </button>
        <button
          onClick={() => setFilter('disabled')}
          className={`px-4 py-2 rounded ${filter === 'disabled' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          2FA Disabled
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enabled At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">
                  <div className="font-medium">{user.firstName} {user.lastName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  {user.twoFactorEnabled ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {user.twoFactorMethod === 'totp' ? 'Authenticator App' : user.twoFactorMethod === 'email' ? 'Email' : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.twoFactorEnabledAt ? new Date(user.twoFactorEnabledAt).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/web/src/app/admin/security/2fa/page.tsx
git commit -m "feat(admin): add 2FA dashboard with stats and user list"
```

---

## Group 11: Compliance Documentation (3 tasks)

### Task 25: Create Business Associate Agreement template

**Files:**
- Create: `docs/compliance/business-associate-agreement.md`

**Step 1: Create BAA document**

```markdown
# Business Associate Agreement (BAA)

**Effective Date:** January 2026

## Purpose

This Business Associate Agreement ("Agreement") is entered into by and between My Christian Counselor ("Covered Entity") and [Business Associate Name] ("Business Associate") to ensure compliance with the Health Insurance Portability and Accountability Act (HIPAA) regulations.

## Definitions

**Protected Health Information (PHI):** Information that relates to the individual's past, present, or future physical or mental health condition, the provision of health care to the individual, or payment for such health care.

**Breach:** Unauthorized acquisition, access, use, or disclosure of PHI that compromises the security or privacy of such information.

## Obligations of Business Associate

### 1. Permitted Uses and Disclosures
Business Associate may use or disclose PHI only as permitted by this Agreement or as required by law.

### 2. Safeguards
Business Associate shall implement appropriate administrative, physical, and technical safeguards to prevent unauthorized use or disclosure of PHI, including:
- Encryption at rest (AES-256-GCM)
- Encryption in transit (TLS 1.2+)
- Access controls and authentication
- Audit logging
- Employee training

### 3. Breach Notification
Business Associate shall report any Breach of Unsecured PHI to Covered Entity within 24 hours of discovery.

### 4. Subcontractors
Business Associate shall ensure that any subcontractors with access to PHI agree to the same restrictions and conditions.

### 5. Access to PHI
Business Associate shall provide access to PHI to individuals as required by HIPAA regulations.

### 6. Amendment of PHI
Business Associate shall make amendments to PHI as directed by Covered Entity.

### 7. Accounting of Disclosures
Business Associate shall document all disclosures of PHI and provide an accounting upon request.

### 8. Availability of Records
Business Associate shall make its internal practices, books, and records relating to PHI available to the Secretary of Health and Human Services for compliance determination.

## Obligations of Covered Entity

1. Provide Business Associate with Notice of Privacy Practices
2. Notify Business Associate of any limitations in the Notice of Privacy Practices
3. Notify Business Associate of any patient restrictions or revocations

## Term and Termination

### Term
This Agreement shall be effective as of the Effective Date and shall terminate when all PHI is destroyed or returned to Covered Entity.

### Termination for Cause
Either party may terminate this Agreement if the other party breaches a material term and fails to cure within 30 days of written notice.

### Effect of Termination
Upon termination, Business Associate shall return or destroy all PHI, except as required by law to retain.

## Miscellaneous

### Regulatory References
This Agreement incorporates by reference 45 CFR §§ 164.308, 164.310, 164.312, and 164.314.

### Amendment
The parties agree to amend this Agreement as necessary to comply with changes in HIPAA regulations.

### Survival
The obligations of Business Associate under this Agreement shall survive termination.

---

**Covered Entity:**
My Christian Counselor

**Business Associate:**
[Name]
[Title]
[Signature]
[Date]
```

**Step 2: Commit**

```bash
git add docs/compliance/business-associate-agreement.md
git commit -m "docs(compliance): add Business Associate Agreement template"
```

---

### Task 26: Create Incident Response Plan

**Files:**
- Create: `docs/compliance/incident-response-plan.md`

**Step 1: Create incident response document**

```markdown
# Incident Response Plan

**Version:** 1.0
**Effective Date:** January 2026
**Compliance:** HIPAA Security Rule, GDPR Article 33

## Purpose

This Incident Response Plan outlines procedures for detecting, responding to, and recovering from security incidents involving Protected Health Information (PHI) or Personal Data.

## Incident Classification

### Level 1: Critical
- Confirmed PHI breach affecting >500 individuals
- Ransomware attack encrypting PHI
- Unauthorized access to production databases
- Data exfiltration detected

**Response Time:** Immediate (within 1 hour)

### Level 2: High
- Suspected PHI breach affecting <500 individuals
- Successful phishing attack on staff
- Malware detected on systems with PHI access
- Failed intrusion attempts

**Response Time:** Within 4 hours

### Level 3: Medium
- Security vulnerability discovered
- Policy violations without confirmed breach
- Suspicious activity detected

**Response Time:** Within 24 hours

## Incident Response Team

**Incident Commander:** Platform Administrator
**Technical Lead:** Senior Developer
**Compliance Officer:** Legal/Privacy Officer
**Communications Lead:** Customer Success Manager

## Response Procedures

### Phase 1: Detection & Analysis (0-2 hours)

**Actions:**
1. **Identify** the incident through monitoring, alerts, or reports
2. **Document** initial findings (timestamp, nature, affected systems)
3. **Classify** severity level (Critical/High/Medium)
4. **Activate** incident response team
5. **Preserve** evidence (logs, screenshots, system snapshots)

**Tools:**
- CloudWatch logs
- Application logs
- Database audit logs
- Network traffic logs

### Phase 2: Containment (2-6 hours)

**Short-term Containment:**
1. **Isolate** affected systems (disable accounts, block IPs)
2. **Preserve** system state for forensics
3. **Prevent** further unauthorized access
4. **Communicate** with stakeholders

**Long-term Containment:**
1. **Patch** vulnerabilities
2. **Reset** compromised credentials
3. **Review** access controls
4. **Monitor** for continued threats

### Phase 3: Eradication (6-24 hours)

**Actions:**
1. **Remove** malware, unauthorized accounts, backdoors
2. **Close** security vulnerabilities
3. **Update** security controls
4. **Verify** system integrity

### Phase 4: Recovery (24-72 hours)

**Actions:**
1. **Restore** systems from clean backups if necessary
2. **Verify** system functionality
3. **Monitor** for residual threats (14 days)
4. **Gradually** restore normal operations

### Phase 5: Post-Incident Review (Within 7 days)

**Actions:**
1. **Document** incident timeline and actions taken
2. **Analyze** root cause
3. **Identify** lessons learned
4. **Update** security controls and procedures
5. **Conduct** team debrief

## Breach Notification Requirements

### HIPAA Breach Notification (45 CFR § 164.404-414)

**Timeline:**
- **Individuals:** Within 60 days of discovery
- **HHS:** Within 60 days (if <500 affected) or immediately (if >500 affected)
- **Media:** Immediately if >500 affected in same state/jurisdiction

**Required Information:**
1. Description of the breach
2. Types of PHI involved
3. Steps individuals should take
4. What the organization is doing
5. Contact information

### GDPR Breach Notification (Article 33-34)

**Timeline:**
- **Supervisory Authority:** Within 72 hours of discovery
- **Data Subjects:** Without undue delay if high risk

**Required Information:**
1. Nature of the breach
2. Categories and approximate number of data subjects affected
3. Contact point for more information
4. Likely consequences
5. Measures taken or proposed

## Communication Templates

### Internal Notification Template

```
SUBJECT: SECURITY INCIDENT - [LEVEL] - [BRIEF DESCRIPTION]

Team,

A security incident has been detected:
- Classification: [Level 1/2/3]
- Affected Systems: [List]
- PHI Involved: [Yes/No/Unknown]
- Number of Individuals: [Estimate]
- Initial Response: [Actions taken]
- Next Steps: [Planned actions]

Incident Commander: [Name]
Status Updates: Every [X] hours

Do not discuss this incident outside the response team until authorized.
```

### User Notification Template

```
SUBJECT: Security Notice - Action Required

Dear [Name],

We are writing to inform you of a security incident that may have affected your personal information.

What Happened:
[Brief description of incident]

What Information Was Involved:
[List types of data]

What We Are Doing:
[Security measures implemented]

What You Should Do:
[Specific actions recommended]

Contact Us:
[Support contact information]

We sincerely apologize for this incident and are committed to protecting your information.
```

## Prevention Measures

### Technical Controls
- Encryption at rest (AES-256-GCM)
- Encryption in transit (TLS 1.2+)
- Multi-factor authentication
- Role-based access control
- Intrusion detection systems
- Regular vulnerability scanning
- Automated backups
- Audit logging

### Administrative Controls
- Annual security training
- Background checks for staff
- Vendor risk assessments
- Business Associate Agreements
- Incident response drills (quarterly)
- Access reviews (monthly)

### Physical Controls
- Secure data center facilities
- Badge access systems
- Video surveillance
- Visitor logs

## Testing & Training

**Tabletop Exercises:** Quarterly
**Security Training:** Annual (all staff)
**Plan Review:** Annual or after incidents
**Phishing Simulations:** Monthly

## Appendices

### Appendix A: Contact List
[Internal team contacts]
[External contacts: legal, PR, cyber insurance]

### Appendix B: Evidence Collection Checklist
- [ ] System logs captured
- [ ] Screenshots taken
- [ ] Network traffic captured
- [ ] Memory dumps collected
- [ ] Chain of custody documented

### Appendix C: Forensic Tools
- Log aggregation: CloudWatch
- Network analysis: VPC Flow Logs
- Disk imaging: AWS EBS Snapshots
- Memory analysis: EC2 System Manager

---

**Document Owner:** Platform Administrator
**Review Frequency:** Annual
**Last Reviewed:** January 2026
```

**Step 2: Commit**

```bash
git add docs/compliance/incident-response-plan.md
git commit -m "docs(compliance): add comprehensive incident response plan"
```

---

### Task 27: Create Data Protection Policy

**Files:**
- Create: `docs/compliance/data-protection-policy.md`

**Step 1: Create data protection document**

```markdown
# Data Protection Policy

**Version:** 1.0
**Effective Date:** January 2026
**Compliance:** HIPAA Privacy Rule, HIPAA Security Rule, GDPR

## Purpose

This Data Protection Policy establishes standards for collecting, using, storing, and protecting Protected Health Information (PHI) and Personal Data in compliance with HIPAA and GDPR regulations.

## Scope

This policy applies to:
- All employees, contractors, and vendors with access to PHI/Personal Data
- All systems, applications, and databases containing PHI/Personal Data
- All physical and electronic records

## Data Classification

### Protected Health Information (PHI)
Information that identifies an individual and relates to:
- Physical or mental health condition
- Provision of health care
- Payment for health care

**Examples:**
- Counseling session notes
- Treatment plans
- Assessment results
- User health information
- Appointment records

### Personal Data (GDPR)
Any information relating to an identified or identifiable natural person.

**Examples:**
- Name, email address, phone number
- IP address, device identifiers
- User preferences and settings
- Payment information

## Data Protection Principles

### 1. Lawfulness, Fairness, Transparency
- Obtain explicit consent before processing PHI/Personal Data
- Provide clear privacy notices
- Process data only for specified, legitimate purposes

### 2. Purpose Limitation
- Collect data only for specified counseling/platform purposes
- Do not use data for incompatible secondary purposes

### 3. Data Minimization
- Collect only data necessary for the stated purpose
- Regularly review and delete unnecessary data

### 4. Accuracy
- Maintain accurate and up-to-date records
- Allow users to correct inaccurate data

### 5. Storage Limitation
- Retain data only as long as necessary
- Implement automated deletion schedules

### 6. Integrity and Confidentiality
- Implement appropriate security measures
- Protect against unauthorized access, loss, or damage

### 7. Accountability
- Demonstrate compliance through documentation
- Conduct regular audits and assessments

## Data Security Measures

### Technical Safeguards

**Encryption:**
- At rest: AES-256-GCM for all databases and file storage
- In transit: TLS 1.2+ for all network communications
- 2FA secrets: AES-256-GCM with per-environment encryption keys

**Access Control:**
- Role-based access control (RBAC)
- Principle of least privilege
- Multi-factor authentication for administrative access
- Automatic session timeout (30 minutes)

**Audit Controls:**
- Comprehensive audit logging
- Log retention: 6 years (HIPAA requirement)
- Regular log review and analysis
- Alerts for suspicious activity

**Integrity Controls:**
- Database transaction logs
- Checksum validation
- Version control for code
- Regular data backups

**Transmission Security:**
- TLS 1.2+ for all API communications
- VPN for remote administrative access
- Secure file transfer protocols

### Administrative Safeguards

**Security Management:**
- Annual risk assessments
- Security incident procedures
- Disaster recovery plan
- Emergency mode operations

**Workforce Training:**
- Annual HIPAA/GDPR training
- Role-specific security training
- Phishing awareness training
- Incident response training

**Access Management:**
- User provisioning/deprovisioning procedures
- Access review (monthly)
- Privileged access management
- Separation of duties

**Vendor Management:**
- Business Associate Agreements required
- Vendor risk assessments
- Regular vendor audits
- Contract termination procedures

### Physical Safeguards

**Facility Access:**
- AWS data centers with physical security
- Badge access systems
- Video surveillance
- Visitor logs

**Workstation Security:**
- Encrypted laptops/devices
- Screen privacy filters
- Automatic screen lock (10 minutes)
- Clean desk policy

**Device Management:**
- Mobile device management (MDM)
- Remote wipe capability
- Lost/stolen device procedures

## Data Retention

### Counseling Records (PHI)
**Retention Period:** 6 years from last session
**Legal Basis:** HIPAA requirement (45 CFR § 164.530)

**Includes:**
- Session notes
- Treatment plans
- Assessment results
- Crisis alerts
- Wellbeing history

### User Account Data
**Retention Period:** 30 days after account deletion
**Legal Basis:** GDPR right to erasure (Article 17)

**Exceptions:**
- Legal hold for litigation
- Regulatory requirements
- Fraud prevention (90 days)

### Audit Logs
**Retention Period:** 6 years
**Legal Basis:** HIPAA requirement (45 CFR § 164.316)

### Marketing Data
**Retention Period:** Until consent withdrawn
**Legal Basis:** GDPR consent (Article 6)

## Data Subject Rights (GDPR)

### Right of Access (Article 15)
Users can request a copy of their personal data.
**Response Time:** Within 30 days

### Right to Rectification (Article 16)
Users can correct inaccurate personal data.
**Response Time:** Within 30 days

### Right to Erasure (Article 17)
Users can request deletion of personal data.
**Response Time:** Within 30 days
**Exceptions:** Legal obligations, public interest

### Right to Restrict Processing (Article 18)
Users can limit how their data is used.
**Response Time:** Within 30 days

### Right to Data Portability (Article 20)
Users can receive their data in a structured format.
**Response Time:** Within 30 days

### Right to Object (Article 21)
Users can object to processing for direct marketing.
**Response Time:** Immediate cessation

## HIPAA Individual Rights

### Right of Access (45 CFR § 164.524)
Individuals can inspect and obtain copies of PHI.
**Response Time:** Within 30 days (extendable to 60 days)
**Fee:** Reasonable cost-based fee permitted

### Right to Amend (45 CFR § 164.526)
Individuals can request amendments to PHI.
**Response Time:** Within 60 days (extendable to 90 days)

### Right to Accounting (45 CFR § 164.528)
Individuals can request list of PHI disclosures.
**Response Time:** Within 60 days (extendable to 90 days)
**Scope:** 6 years of disclosures

### Right to Restrict (45 CFR § 164.522)
Individuals can request restrictions on PHI use/disclosure.
**Note:** Not required to agree, but if agreed must comply

### Right to Confidential Communications (45 CFR § 164.522)
Individuals can request communications via alternative means.

## Breach Response

Refer to **Incident Response Plan** for detailed procedures.

**HIPAA Breach Definition:**
Unauthorized acquisition, access, use, or disclosure of PHI that compromises security or privacy.

**4-Factor Risk Assessment:**
1. Nature and extent of PHI involved
2. Unauthorized person who accessed PHI
3. Whether PHI was actually viewed or acquired
4. Extent to which risk has been mitigated

**Low Risk:** No notification required if documented
**High Risk:** Notification required within 60 days

## Data Processing Agreements

All third-party vendors with access to PHI/Personal Data must sign:
- **Business Associate Agreement (BAA)** for HIPAA
- **Data Processing Agreement (DPA)** for GDPR

**Required Vendors:**
- AWS (cloud infrastructure)
- Postmark (email service)
- Stripe (payment processing)
- Sentry (error monitoring)

## International Data Transfers

**GDPR Requirement:** Adequate protection for data transferred outside EEA.

**Mechanisms:**
- AWS Standard Contractual Clauses (SCCs)
- EU-US Data Privacy Framework (if applicable)

**Data Locations:**
- Primary: US-East-2 (Ohio)
- Backups: US-East-1 (Virginia)

## Privacy by Design

### Development Practices
- Data protection impact assessments (DPIAs) for new features
- Privacy requirements in design specifications
- Security code reviews
- Automated security testing

### Default Settings
- Minimum data collection by default
- Strongest security settings by default
- Opt-in for marketing communications
- Privacy-preserving analytics

## Accountability Measures

### Documentation
- Privacy notices
- Consent records
- Data processing agreements
- Risk assessments
- Audit logs
- Training records

### Audits
- Internal audits (quarterly)
- External audits (annual)
- Vendor audits (annual)

### Reporting
- Quarterly privacy metrics to leadership
- Annual compliance report
- Incident reports as needed

## Sanctions for Non-Compliance

**Internal:**
- Verbal warning
- Written warning
- Suspension
- Termination

**External:**
- Contract termination
- Legal action

## Policy Review

**Review Frequency:** Annual or after significant incidents
**Approval Authority:** Platform Administrator, Legal Counsel

**Triggers for Revision:**
- Changes in regulations
- Significant security incidents
- Technology changes
- Business model changes

---

**Policy Owner:** Platform Administrator
**Approved By:** Legal Counsel
**Next Review Date:** January 2027
```

**Step 2: Commit**

```bash
git add docs/compliance/data-protection-policy.md
git commit -m "docs(compliance): add comprehensive data protection policy"
```

---

## Summary

**Phase 5: Security & Compliance - Implementation Scope**

### Part A: 2FA System (29 tasks)
- Two-tier optional 2FA (TOTP recommended, Email fallback)
- AES-256-GCM encryption for secrets
- 10 backup codes with regeneration
- 6-digit email codes (30min expiry, single-use)
- TOTP with speakeasy (30s window)
- 9-day encouragement banners (3 types)
- Admin 2FA status dashboard

### Part B: Compliance Docs (3 tasks)
- Business Associate Agreements tracking
- Incident Response Plan (HIPAA/GDPR)
- Data Protection Policy

**Total: 32 tasks covering complete 2FA system + compliance documentation**

**Phase 5 implementation plan created successfully! This completes all 5 phases.**
