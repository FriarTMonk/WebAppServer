# Phase 2A: User Authentication & Basic Organizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete email/password authentication with hybrid JWT approach and basic organizational features with flexible RBAC

**Architecture:** Hybrid authentication using short-lived JWT access tokens (15 min) with server-side refresh tokens (30 days). Password hashing with bcrypt. Flexible RBAC system with predefined roles (Owner, Counselor, Member) and custom permission assignments. Fresh start for authenticated users (no anonymous session claiming).

**Tech Stack:** NestJS, Prisma, PostgreSQL, @nestjs/jwt, @nestjs/passport, bcrypt, class-validator, Next.js 15, React 19

---

## Task 1: Update Database Schema for Auth & Organizations

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

**Step 1: Add User, RefreshToken, Organization, and RBAC models**

Add these models to the schema:

```prisma
// User account
model User {
  id                String              @id @default(uuid())
  email             String              @unique
  passwordHash      String
  firstName         String?
  lastName          String?
  emailVerified     Boolean             @default(false)
  verificationToken String?             @unique
  resetToken        String?             @unique
  resetTokenExpiry  DateTime?
  isActive          Boolean             @default(true)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relations
  refreshTokens     RefreshToken[]
  sessions          Session[]
  organizationMemberships OrganizationMember[]
  invitationsCreated OrganizationInvitation[] @relation("CreatedByUser")
  invitationsReceived OrganizationInvitation[] @relation("InvitedUser")

  @@index([email])
  @@index([verificationToken])
  @@index([resetToken])
}

// JWT refresh tokens (server-side storage)
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}

// Organization (church, ministry, counseling center)
model Organization {
  id                String    @id @default(uuid())
  name              String
  description       String?   @db.Text
  licenseType       String?   // 'Family', 'Small', 'Medium', 'Large'
  licenseStatus     String    @default("trial") // 'trial', 'active', 'expired', 'cancelled'
  licenseExpiresAt  DateTime?
  maxMembers        Int       @default(10)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  members           OrganizationMember[]
  invitations       OrganizationInvitation[]
  roles             OrganizationRole[]

  @@index([licenseStatus])
  @@index([licenseExpiresAt])
}

// User membership in organization
model OrganizationMember {
  id             String       @id @default(uuid())
  organizationId String
  userId         String
  roleId         String
  joinedAt       DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           OrganizationRole @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}

// Flexible role system
model OrganizationRole {
  id             String       @id @default(uuid())
  organizationId String
  name           String       // 'Owner', 'Counselor', 'Member', or custom
  description    String?
  isSystemRole   Boolean      @default(false) // true for Owner, Counselor, Member
  permissions    Json         @default("[]") // Array of permission strings
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members        OrganizationMember[]

  @@unique([organizationId, name])
  @@index([organizationId])
}

// Organization invitations
model OrganizationInvitation {
  id             String       @id @default(uuid())
  organizationId String
  email          String
  roleId         String
  invitedById    String
  token          String       @unique
  status         String       @default("pending") // 'pending', 'accepted', 'expired', 'cancelled'
  expiresAt      DateTime
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedBy      User         @relation("CreatedByUser", fields: [invitedById], references: [id], onDelete: Cascade)
  acceptedBy     User?        @relation("InvitedUser", fields: [acceptedById], references: [id], onDelete: SetNull)
  acceptedById   String?

  @@index([organizationId])
  @@index([email])
  @@index([token])
  @@index([status])
  @@index([expiresAt])
}
```

**Step 2: Update Session model to link to User**

The Session model already has `userId String?` - this is correct. Verify it's properly indexed.

**Step 3: Generate migration**

```bash
cd packages/api
npx prisma migrate dev --name add_auth_and_organizations
```

Expected: Migration files created, database updated

**Step 4: Generate Prisma Client**

```bash
npx prisma generate
```

Expected: Prisma Client regenerated with new models

**Step 5: Commit**

```bash
git add packages/api/prisma/schema.prisma packages/api/prisma/migrations/
git commit -m "feat(auth): add User, Organization, and RBAC database schema"
```

---

## Task 2: Install Auth Dependencies

**Files:**
- Modify: `package.json` (root)

**Step 1: Install NestJS auth packages**

```bash
npm install --save @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt
```

Expected: Packages installed successfully

**Step 2: Verify installation**

```bash
npm list @nestjs/jwt @nestjs/passport bcrypt
```

Expected: All packages listed with versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install auth dependencies (jwt, passport, bcrypt)"
```

---

## Task 3: Create Shared Auth Types

**Files:**
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Add auth and organization types**

Add to the existing types file:

```typescript
// ===== AUTH TYPES =====

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetDto {
  token: string;
  newPassword: string;
}

export interface EmailVerificationDto {
  token: string;
}

// ===== ORGANIZATION TYPES =====

export type LicenseType = 'Family' | 'Small' | 'Medium' | 'Large';
export type LicenseStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  licenseType: LicenseType | null;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: Date | null;
  maxMembers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  joinedAt: Date;
  user: User;
  role: OrganizationRole;
}

export interface OrganizationRole {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  invitedById: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  organization: Organization;
  invitedBy: User;
}

// Permission system
export enum Permission {
  // Organization management
  MANAGE_ORGANIZATION = 'manage_organization',
  VIEW_ORGANIZATION = 'view_organization',

  // Member management
  MANAGE_MEMBERS = 'manage_members',
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',
  VIEW_MEMBERS = 'view_members',

  // Role management
  MANAGE_ROLES = 'manage_roles',
  ASSIGN_ROLES = 'assign_roles',

  // Counseling features
  VIEW_MEMBER_CONVERSATIONS = 'view_member_conversations',
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_DATA = 'export_data',

  // Billing (for future)
  MANAGE_BILLING = 'manage_billing',
  VIEW_BILLING = 'view_billing',
}

// DTOs for organization operations
export interface CreateOrganizationDto {
  name: string;
  description?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
}

export interface InviteMemberDto {
  email: string;
  roleId: string;
}

export interface UpdateMemberRoleDto {
  roleId: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

export interface AcceptInvitationDto {
  token: string;
}
```

**Step 2: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(shared): add auth and organization types"
```

---

## Task 4: Create Auth Service with Password Hashing

**Files:**
- Create: `packages/api/src/auth/auth.service.ts`
- Create: `packages/api/src/auth/auth.module.ts`
- Create: `packages/api/src/auth/auth.controller.ts`

**Step 1: Write test for password hashing**

Create: `packages/api/src/auth/auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_ACCESS_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '30d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$')).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npx jest auth.service.spec.ts
```

Expected: FAIL - "Cannot find module './auth.service'"

**Step 3: Create AuthService with password methods**

Create: `packages/api/src/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  RegisterDto,
  LoginDto,
  AuthResponse,
  JwtPayload,
  User,
  AuthTokens
} from '@mychristiancounselor/shared';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ===== PASSWORD METHODS =====

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ===== TOKEN GENERATION =====

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });
  }

  async generateRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  async generateTokens(user: User, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(user.id, ipAddress, userAgent);

    return { accessToken, refreshToken };
  }

  // ===== REGISTRATION & LOGIN =====

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        verificationToken,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(this.sanitizeUser(user));

    // TODO: Send verification email (Task for later)

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Generate tokens
    const tokens = await this.generateTokens(this.sanitizeUser(user), ipAddress, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ===== TOKEN REFRESH =====

  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    // Find refresh token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if expired
    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    // Generate new tokens
    return this.generateTokens(this.sanitizeUser(tokenRecord.user), ipAddress, userAgent);
  }

  // ===== LOGOUT =====

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // ===== UTILITY =====

  private sanitizeUser(user: any): User {
    const { passwordHash, verificationToken, resetToken, resetTokenExpiry, ...sanitized } = user;
    return sanitized;
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest auth.service.spec.ts
```

Expected: PASS - All tests passing

**Step 5: Commit**

```bash
git add packages/api/src/auth/
git commit -m "feat(auth): add AuthService with password hashing and token generation"
```

---

## Task 5: Create JWT Strategy and Guards

**Files:**
- Create: `packages/api/src/auth/strategies/jwt.strategy.ts`
- Create: `packages/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `packages/api/src/auth/decorators/current-user.decorator.ts`

**Step 1: Create JWT Strategy**

Create: `packages/api/src/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '@mychristiancounselor/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Load user from database to ensure they still exist and are active
    const user = await this.authService.getUserById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user; // This becomes req.user
  }
}
```

**Step 2: Create JWT Auth Guard**

Create: `packages/api/src/auth/guards/jwt-auth.guard.ts`

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

**Step 3: Create Public decorator**

Create: `packages/api/src/auth/decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Step 4: Create CurrentUser decorator**

Create: `packages/api/src/auth/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@mychristiancounselor/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

**Step 5: Commit**

```bash
git add packages/api/src/auth/strategies/ packages/api/src/auth/guards/ packages/api/src/auth/decorators/
git commit -m "feat(auth): add JWT strategy, guards, and decorators"
```

---

## Task 6: Create Auth Controller and Module

**Files:**
- Create: `packages/api/src/auth/auth.controller.ts`
- Create: `packages/api/src/auth/auth.module.ts`
- Modify: `packages/api/src/app/app.module.ts`

**Step 1: Create Auth Controller**

Create: `packages/api/src/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponse,
  AuthTokens,
  User
} from '@mychristiancounselor/shared';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokens> {
    return this.authService.refreshAccessToken(
      dto.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser('id') userId: string): Promise<void> {
    await this.authService.logoutAll(userId);
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}
```

**Step 2: Create Auth Module**

Create: `packages/api/src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 3: Import AuthModule and register global guard**

Modify: `packages/api/src/app/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { CounselModule } from '../counsel/counsel.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CounselModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

**Step 4: Add environment variables**

Create/Modify: `packages/api/.env` (add these lines if not present)

```
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d
```

**Step 5: Test the endpoints manually**

```bash
# Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Test protected endpoint (should fail without token)
curl http://localhost:3000/auth/me

# Test protected endpoint with token (use accessToken from login response)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: Registration and login return tokens, /auth/me fails without token and succeeds with valid token

**Step 6: Commit**

```bash
git add packages/api/src/auth/ packages/api/src/app/app.module.ts packages/api/.env
git commit -m "feat(auth): add auth controller, module, and wire up global JWT guard"
```

---

## Task 7: Mark Existing Endpoints as Public

**Files:**
- Modify: `packages/api/src/counsel/counsel.controller.ts`
- Modify: `packages/api/src/scripture/strongs.controller.ts`

**Step 1: Add @Public() decorator to counsel endpoints**

Modify: `packages/api/src/counsel/counsel.controller.ts`

```typescript
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CounselService } from './counsel.service';
import { CounselRequestDto } from './dto/counsel-request.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('counsel')
export class CounselController {
  constructor(private counselService: CounselService) {}

  @Public() // Add this
  @Post('ask')
  async ask(@Body() dto: CounselRequestDto) {
    return this.counselService.processQuestion(
      dto.message,
      dto.sessionId,
      dto.preferredTranslation,
      dto.comparisonMode,
      dto.comparisonTranslations
    );
  }

  @Public() // Add this
  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.counselService.getSession(id);
  }
}
```

**Step 2: Add @Public() decorator to Strong's endpoints**

Modify: `packages/api/src/scripture/strongs.controller.ts`

```typescript
import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { StrongsService } from './strongs.service';
import { StrongsDefinition } from '@mychristiancounselor/shared';
import { Public } from '../auth/decorators/public.decorator';

@Public() // Add this to entire controller
@Controller('strongs')
export class StrongsController {
  constructor(private readonly strongsService: StrongsService) {}

  @Get(':number')
  getDefinition(@Param('number') number: string): StrongsDefinition | null {
    return this.strongsService.getDefinition(number);
  }

  @Post('bulk')
  getDefinitions(
    @Body() body: { numbers: string[] }
  ): Record<string, StrongsDefinition> {
    return this.strongsService.getDefinitions(body.numbers);
  }

  @Get('stats')
  getStatistics() {
    return this.strongsService.getStatistics();
  }

  @Get('search')
  searchDefinitions(
    @Query('q') keyword: string,
    @Query('limit') limit?: string
  ): StrongsDefinition[] {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.strongsService.searchDefinitions(keyword, limitNum);
  }
}
```

**Step 3: Test that existing endpoints still work**

```bash
# Test counsel endpoint (should work without auth)
curl -X POST http://localhost:3000/counsel/ask \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I find peace?","sessionId":"test-session"}'

# Test Strong's endpoint (should work without auth)
curl http://localhost:3000/strongs/G26
```

Expected: Both endpoints work without authentication

**Step 4: Commit**

```bash
git add packages/api/src/counsel/counsel.controller.ts packages/api/src/scripture/strongs.controller.ts
git commit -m "feat(auth): mark existing counsel and scripture endpoints as public"
```

---

## Task 8: Create Organization Service (Foundation)

**Files:**
- Create: `packages/api/src/organization/organization.service.ts`
- Create: `packages/api/src/organization/organization.module.ts`
- Create: `packages/api/src/organization/organization.controller.ts`

**Step 1: Write test for organization creation**

Create: `packages/api/src/organization/organization.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';
import { Permission } from '@mychristiancounselor/shared';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: PrismaService,
          useValue: {
            organization: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            organizationRole: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            organizationMember: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createOrganization', () => {
    it('should create organization with system roles and add creator as owner', async () => {
      const userId = 'user-123';
      const dto = { name: 'Test Church', description: 'A test church' };

      const mockOrg = {
        id: 'org-123',
        name: dto.name,
        description: dto.description,
        licenseStatus: 'trial',
        maxMembers: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOwnerRole = {
        id: 'role-owner',
        organizationId: mockOrg.id,
        name: 'Owner',
        isSystemRole: true,
        permissions: [Permission.MANAGE_ORGANIZATION],
      };

      jest.spyOn(prisma.organization, 'create').mockResolvedValue(mockOrg as any);
      jest.spyOn(prisma.organizationRole, 'create').mockResolvedValue(mockOwnerRole as any);

      const result = await service.createOrganization(userId, dto);

      expect(prisma.organization.create).toHaveBeenCalled();
      expect(result.name).toBe(dto.name);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/api
npx jest organization.service.spec.ts
```

Expected: FAIL - "Cannot find module './organization.service'"

**Step 3: Create OrganizationService**

Create: `packages/api/src/organization/organization.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationMember,
  OrganizationRole,
  Permission,
  CreateRoleDto,
  UpdateRoleDto,
  InviteMemberDto,
  OrganizationInvitation,
} from '@mychristiancounselor/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class OrganizationService {
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(private prisma: PrismaService) {}

  // ===== ORGANIZATION CRUD =====

  async createOrganization(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    // Create organization with trial license
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        description: dto.description,
        licenseStatus: 'trial',
        maxMembers: 10, // Trial default
      },
    });

    // Create system roles: Owner, Counselor, Member
    const ownerRole = await this.createSystemRole(
      organization.id,
      'Owner',
      'Full access to manage organization',
      [
        Permission.MANAGE_ORGANIZATION,
        Permission.MANAGE_MEMBERS,
        Permission.INVITE_MEMBERS,
        Permission.REMOVE_MEMBERS,
        Permission.VIEW_MEMBERS,
        Permission.MANAGE_ROLES,
        Permission.ASSIGN_ROLES,
        Permission.VIEW_MEMBER_CONVERSATIONS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
        Permission.MANAGE_BILLING,
        Permission.VIEW_BILLING,
      ]
    );

    await this.createSystemRole(
      organization.id,
      'Counselor',
      'Can view member conversations and analytics',
      [
        Permission.VIEW_ORGANIZATION,
        Permission.VIEW_MEMBERS,
        Permission.VIEW_MEMBER_CONVERSATIONS,
        Permission.VIEW_ANALYTICS,
      ]
    );

    await this.createSystemRole(
      organization.id,
      'Member',
      'Basic member access',
      [
        Permission.VIEW_ORGANIZATION,
      ]
    );

    // Add creator as owner
    await this.prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId,
        roleId: ownerRole.id,
      },
    });

    return organization;
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationDto
  ): Promise<Organization> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.MANAGE_ORGANIZATION);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });

    return memberships.map(m => m.organization);
  }

  // ===== ROLE MANAGEMENT =====

  private async createSystemRole(
    organizationId: string,
    name: string,
    description: string,
    permissions: Permission[]
  ): Promise<OrganizationRole> {
    return this.prisma.organizationRole.create({
      data: {
        organizationId,
        name,
        description,
        isSystemRole: true,
        permissions: permissions,
      },
    }) as any;
  }

  async createCustomRole(
    organizationId: string,
    userId: string,
    dto: CreateRoleDto
  ): Promise<OrganizationRole> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.MANAGE_ROLES);

    // Don't allow duplicate role names
    const existing = await this.prisma.organizationRole.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Role with this name already exists');
    }

    return this.prisma.organizationRole.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        isSystemRole: false,
        permissions: dto.permissions,
      },
    }) as any;
  }

  async updateRole(
    roleId: string,
    organizationId: string,
    userId: string,
    dto: UpdateRoleDto
  ): Promise<OrganizationRole> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.MANAGE_ROLES);

    // Get role
    const role = await this.prisma.organizationRole.findUnique({
      where: { id: roleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }

    // Cannot modify system roles
    if (role.isSystemRole) {
      throw new ForbiddenException('Cannot modify system roles');
    }

    return this.prisma.organizationRole.update({
      where: { id: roleId },
      data: dto,
    }) as any;
  }

  async getOrganizationRoles(organizationId: string): Promise<OrganizationRole[]> {
    return this.prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: [
        { isSystemRole: 'desc' },
        { name: 'asc' },
      ],
    }) as any;
  }

  // ===== MEMBER MANAGEMENT =====

  async getOrganizationMembers(organizationId: string, userId: string): Promise<OrganizationMember[]> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.VIEW_MEMBERS);

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: true,
        role: true,
      },
    }) as any;
  }

  async updateMemberRole(
    memberId: string,
    organizationId: string,
    userId: string,
    newRoleId: string
  ): Promise<OrganizationMember> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.ASSIGN_ROLES);

    // Verify member belongs to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found');
    }

    // Verify role belongs to organization
    const role = await this.prisma.organizationRole.findUnique({
      where: { id: newRoleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { roleId: newRoleId },
      include: {
        user: true,
        role: true,
      },
    }) as any;
  }

  async removeMember(
    memberId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.REMOVE_MEMBERS);

    // Verify member belongs to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove yourself if you're the last owner
    if (member.userId === userId) {
      const ownerRole = await this.prisma.organizationRole.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: 'Owner',
          },
        },
      });

      if (ownerRole) {
        const ownerCount = await this.prisma.organizationMember.count({
          where: {
            organizationId,
            roleId: ownerRole.id,
          },
        });

        if (ownerCount === 1) {
          throw new BadRequestException('Cannot remove the last owner');
        }
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });
  }

  // ===== INVITATIONS =====

  async inviteMember(
    organizationId: string,
    userId: string,
    dto: InviteMemberDto
  ): Promise<OrganizationInvitation> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.INVITE_MEMBERS);

    // Check member limit
    const org = await this.getOrganization(organizationId);
    const currentMemberCount = await this.prisma.organizationMember.count({
      where: { organizationId },
    });

    if (currentMemberCount >= org.maxMembers) {
      throw new BadRequestException('Organization has reached member limit');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email: dto.email.toLowerCase() },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email: dto.email.toLowerCase(),
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('Invitation already sent');
    }

    // Verify role exists
    const role = await this.prisma.organizationRole.findUnique({
      where: { id: dto.roleId },
    });

    if (!role || role.organizationId !== organizationId) {
      throw new NotFoundException('Role not found');
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITATION_EXPIRY_DAYS);

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        roleId: dto.roleId,
        invitedById: userId,
        token,
        expiresAt,
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    // TODO: Send invitation email (Task for later)

    return invitation as any;
  }

  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    // Find invitation
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation already used or expired');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Invitation expired');
    }

    // Verify user email matches invitation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException('Invitation not for this user');
    }

    // Check member limit
    const currentMemberCount = await this.prisma.organizationMember.count({
      where: { organizationId: invitation.organizationId },
    });

    if (currentMemberCount >= invitation.organization.maxMembers) {
      throw new BadRequestException('Organization has reached member limit');
    }

    // Add user to organization
    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        roleId: invitation.roleId,
      },
      include: {
        user: true,
        role: true,
      },
    });

    // Mark invitation as accepted
    await this.prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedById: userId,
      },
    });

    return member as any;
  }

  async getPendingInvitations(organizationId: string, userId: string): Promise<OrganizationInvitation[]> {
    // Check permission
    await this.requirePermission(organizationId, userId, Permission.VIEW_MEMBERS);

    return this.prisma.organizationInvitation.findMany({
      where: {
        organizationId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: true,
      },
    }) as any;
  }

  // ===== PERMISSION CHECKING =====

  async hasPermission(
    organizationId: string,
    userId: string,
    permission: Permission
  ): Promise<boolean> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: { role: true },
    });

    if (!member) {
      return false;
    }

    const permissions = member.role.permissions as Permission[];
    return permissions.includes(permission);
  }

  async requirePermission(
    organizationId: string,
    userId: string,
    permission: Permission
  ): Promise<void> {
    const hasPermission = await this.hasPermission(organizationId, userId, permission);

    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  async getUserPermissions(organizationId: string, userId: string): Promise<Permission[]> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: { role: true },
    });

    if (!member) {
      return [];
    }

    return member.role.permissions as Permission[];
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest organization.service.spec.ts
```

Expected: PASS - Tests passing

**Step 5: Commit**

```bash
git add packages/api/src/organization/
git commit -m "feat(org): add OrganizationService with RBAC and invitations"
```

---

## Task 9: Create Organization Controller and Wire Up

**Files:**
- Create: `packages/api/src/organization/organization.controller.ts`
- Create: `packages/api/src/organization/organization.module.ts`
- Modify: `packages/api/src/app/app.module.ts`

**Step 1: Create Organization Controller**

Create: `packages/api/src/organization/organization.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationMember,
  OrganizationRole,
  CreateRoleDto,
  UpdateRoleDto,
  InviteMemberDto,
  AcceptInvitationDto,
  UpdateMemberRoleDto,
  OrganizationInvitation,
} from '@mychristiancounselor/shared';

@Controller('organizations')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  // ===== ORGANIZATION MANAGEMENT =====

  @Post()
  async createOrganization(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto
  ): Promise<Organization> {
    return this.organizationService.createOrganization(userId, dto);
  }

  @Get()
  async getUserOrganizations(
    @CurrentUser('id') userId: string
  ): Promise<Organization[]> {
    return this.organizationService.getUserOrganizations(userId);
  }

  @Get(':id')
  async getOrganization(
    @Param('id') id: string
  ): Promise<Organization> {
    return this.organizationService.getOrganization(id);
  }

  @Put(':id')
  async updateOrganization(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationDto
  ): Promise<Organization> {
    return this.organizationService.updateOrganization(id, userId, dto);
  }

  // ===== ROLE MANAGEMENT =====

  @Get(':id/roles')
  async getOrganizationRoles(
    @Param('id') organizationId: string
  ): Promise<OrganizationRole[]> {
    return this.organizationService.getOrganizationRoles(organizationId);
  }

  @Post(':id/roles')
  async createCustomRole(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRoleDto
  ): Promise<OrganizationRole> {
    return this.organizationService.createCustomRole(organizationId, userId, dto);
  }

  @Put(':id/roles/:roleId')
  async updateRole(
    @Param('id') organizationId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRoleDto
  ): Promise<OrganizationRole> {
    return this.organizationService.updateRole(roleId, organizationId, userId, dto);
  }

  // ===== MEMBER MANAGEMENT =====

  @Get(':id/members')
  async getOrganizationMembers(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string
  ): Promise<OrganizationMember[]> {
    return this.organizationService.getOrganizationMembers(organizationId, userId);
  }

  @Put(':id/members/:memberId/role')
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto
  ): Promise<OrganizationMember> {
    return this.organizationService.updateMemberRole(
      memberId,
      organizationId,
      userId,
      dto.roleId
    );
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string
  ): Promise<void> {
    await this.organizationService.removeMember(memberId, organizationId, userId);
  }

  // ===== INVITATIONS =====

  @Post(':id/invitations')
  async inviteMember(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto
  ): Promise<OrganizationInvitation> {
    return this.organizationService.inviteMember(organizationId, userId, dto);
  }

  @Get(':id/invitations')
  async getPendingInvitations(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string
  ): Promise<OrganizationInvitation[]> {
    return this.organizationService.getPendingInvitations(organizationId, userId);
  }

  @Post('invitations/accept')
  async acceptInvitation(
    @CurrentUser('id') userId: string,
    @Body() dto: AcceptInvitationDto
  ): Promise<OrganizationMember> {
    return this.organizationService.acceptInvitation(dto.token, userId);
  }

  // ===== PERMISSIONS =====

  @Get(':id/permissions')
  async getUserPermissions(
    @Param('id') organizationId: string,
    @CurrentUser('id') userId: string
  ): Promise<string[]> {
    return this.organizationService.getUserPermissions(organizationId, userId);
  }
}
```

**Step 2: Create Organization Module**

Create: `packages/api/src/organization/organization.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
```

**Step 3: Import OrganizationModule in AppModule**

Modify: `packages/api/src/app/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { CounselModule } from '../counsel/counsel.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    CounselModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

**Step 4: Test organization endpoints manually**

```bash
# Register and login first to get access token
ACCESS_TOKEN="your-token-here"

# Create organization
curl -X POST http://localhost:3000/organizations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Church","description":"Our test organization"}'

# Get user's organizations
curl http://localhost:3000/organizations \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get organization roles
ORG_ID="org-id-here"
curl http://localhost:3000/organizations/$ORG_ID/roles \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get organization members
curl http://localhost:3000/organizations/$ORG_ID/members \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected: All endpoints work with proper authentication

**Step 5: Commit**

```bash
git add packages/api/src/organization/ packages/api/src/app/app.module.ts
git commit -m "feat(org): add organization controller and wire up module"
```

---

## Task 10: Add Input Validation DTOs

**Files:**
- Create: `packages/api/src/auth/dto/register.dto.ts`
- Create: `packages/api/src/auth/dto/login.dto.ts`
- Create: `packages/api/src/auth/dto/refresh-token.dto.ts`
- Create: `packages/api/src/organization/dto/*.dto.ts`

**Step 1: Install class-validator if not present**

```bash
npm list class-validator class-transformer
```

If not installed:
```bash
npm install --save class-validator class-transformer
```

**Step 2: Create Auth DTOs**

Create: `packages/api/src/auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number, and special character' }
  )
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
```

Create: `packages/api/src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

Create: `packages/api/src/auth/dto/refresh-token.dto.ts`

```typescript
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
```

**Step 3: Create Organization DTOs**

Create: `packages/api/src/organization/dto/create-organization.dto.ts`

```typescript
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

Create: `packages/api/src/organization/dto/invite-member.dto.ts`

```typescript
import { IsEmail, IsString, IsUUID } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsUUID()
  roleId: string;
}
```

Create: `packages/api/src/organization/dto/create-role.dto.ts`

```typescript
import { IsString, MaxLength, IsOptional, IsArray, IsEnum } from 'class-validator';
import { Permission } from '@mychristiancounselor/shared';

export class CreateRoleDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
```

**Step 4: Update controllers to use DTOs**

Modify: `packages/api/src/auth/auth.controller.ts`

```typescript
import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponse, AuthTokens, User } from '@mychristiancounselor/shared';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokens> {
    return this.authService.refreshAccessToken(
      dto.refreshToken,
      req.ip,
      req.headers['user-agent']
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser('id') userId: string): Promise<void> {
    await this.authService.logoutAll(userId);
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}
```

**Step 5: Test validation**

```bash
# Test password validation (should fail)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak"}'

# Expected: Validation error about password requirements

# Test valid registration (should succeed)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@test.com","password":"Test123!@#","firstName":"Test"}'
```

Expected: Weak password rejected, strong password accepted

**Step 6: Commit**

```bash
git add packages/api/src/auth/dto/ packages/api/src/organization/dto/
git commit -m "feat(validation): add DTOs with class-validator for input validation"
```

---

## Task 11: Create Basic Frontend Auth UI (Login/Register)

**Files:**
- Create: `packages/web/src/app/login/page.tsx`
- Create: `packages/web/src/app/register/page.tsx`
- Create: `packages/web/src/lib/auth.ts`
- Create: `packages/web/src/contexts/AuthContext.tsx`

**Step 1: Create auth utility functions**

Create: `packages/web/src/lib/auth.ts`

```typescript
import { AuthResponse, LoginDto, RegisterDto } from '@mychristiancounselor/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function login(credentials: LoginDto): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

export async function register(data: RegisterDto): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

**Step 2: Create Auth Context**

Create: `packages/web/src/contexts/AuthContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@mychristiancounselor/shared';
import { getAccessToken, clearTokens } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from API on mount if token exists
    const token = getAccessToken();
    if (token) {
      fetch('http://localhost:3000/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => setUser(data))
        .catch(() => clearTokens());
    }
  }, []);

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isAuthenticated: !!user,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Step 3: Create Login Page**

Create: `packages/web/src/app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, saveTokens } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email, password });
      saveTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setUser(response.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 4: Create Register Page**

Create: `packages/web/src/app/register/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, saveTokens } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register({ email, password, firstName, lastName });
      saveTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setUser(response.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="text-xs text-gray-500">
              Password must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 5: Wrap app with AuthProvider**

Modify: `packages/web/src/app/layout.tsx`

Add AuthProvider wrapper around children:

```typescript
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 6: Test authentication flow**

```bash
# Navigate to http://localhost:3001/register
# Register a new account
# Should redirect to home page after registration
# Check localStorage for tokens
# Navigate to http://localhost:3001/login
# Login with same credentials
# Should work and maintain session
```

Expected: Full registration and login flow working

**Step 7: Commit**

```bash
git add packages/web/src/app/login/ packages/web/src/app/register/ packages/web/src/lib/auth.ts packages/web/src/contexts/AuthContext.tsx packages/web/src/app/layout.tsx
git commit -m "feat(web): add login and register pages with auth context"
```

---

## Task 12: Add User Menu and Organization Switcher to UI

**Files:**
- Create: `packages/web/src/components/UserMenu.tsx`
- Create: `packages/web/src/components/OrganizationSwitcher.tsx`
- Modify: `packages/web/src/app/page.tsx`

**Step 1: Create UserMenu component**

Create: `packages/web/src/components/UserMenu.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Sign in
        </button>
        <button
          onClick={() => router.push('/register')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
          {user?.firstName?.[0] || user?.email[0].toUpperCase()}
        </div>
        <span>{user?.firstName || user?.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            {user?.email}
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/organizations');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Organizations
          </button>
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
              router.push('/');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create OrganizationSwitcher component**

Create: `packages/web/src/components/OrganizationSwitcher.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Organization } from '@mychristiancounselor/shared';
import { getAccessToken } from '../lib/auth';

export function OrganizationSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3000/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOrganizations(data);
      if (data.length > 0) {
        setCurrentOrg(data[0]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
      >
        {currentOrg?.name || 'Select Organization'}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10">
          {organizations.map(org => (
            <button
              key={org.id}
              onClick={() => {
                setCurrentOrg(org);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentOrg?.id === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{org.name}</div>
              <div className="text-xs text-gray-500">
                {org.licenseStatus} • {org.maxMembers} members
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Add user menu and org switcher to main page**

Modify: `packages/web/src/app/page.tsx` (add to header/top of page)

```typescript
import { UserMenu } from '../components/UserMenu';
import { OrganizationSwitcher } from '../components/OrganizationSwitcher';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with auth */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                MyChristianCounselor
              </h1>
              <OrganizationSwitcher />
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Rest of your existing page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Your conversation UI here */}
      </main>
    </div>
  );
}
```

**Step 4: Test the UI**

```bash
# Visit http://localhost:3001
# Should see Sign In/Sign Up buttons when not logged in
# Register/Login
# Should see user menu with avatar and name
# Create an organization via API (manual curl or implement create org UI)
# Should see organization switcher appear
```

Expected: Full UI with authentication state and organization switching

**Step 5: Commit**

```bash
git add packages/web/src/components/UserMenu.tsx packages/web/src/components/OrganizationSwitcher.tsx packages/web/src/app/page.tsx
git commit -m "feat(web): add user menu and organization switcher to UI"
```

---

## Verification & Testing

**Step 1: Run all tests**

```bash
cd packages/api
npx jest
```

Expected: All tests passing

**Step 2: Test full authentication flow manually**

1. Register new user → should get tokens
2. Login with credentials → should get tokens
3. Access /auth/me with token → should get user info
4. Access /auth/me without token → should get 401
5. Refresh token → should get new access token
6. Logout → should invalidate refresh token

**Step 3: Test organization flow manually**

1. Create organization → should create with 3 system roles
2. Get user organizations → should see created org
3. Get organization members → should see creator as Owner
4. Invite member → should create invitation
5. Accept invitation (different user) → should add to org
6. Test RBAC → Member cannot manage org, Owner can

**Step 4: Test Web UI end-to-end**

1. Visit site while logged out → see sign in buttons
2. Register account → redirects to home with user menu
3. Create organization via Postman/curl
4. Refresh page → see organization switcher
5. Logout → returns to logged-out state

---

## Next Steps (Not in Phase 2A)

The following are intentionally NOT included in Phase 2A and will be addressed later:

- Email verification
- Password reset functionality
- Email sending (invitation emails, verification emails)
- Profile management page
- Organization settings page
- Member management UI
- License upgrade/payment (Stripe integration)
- Conversation privacy controls
- Analytics dashboard

---

## Summary

This plan implements:

✅ Complete email/password authentication with bcrypt
✅ Hybrid JWT approach (15min access + 30day refresh tokens)
✅ User registration, login, logout, token refresh
✅ Organization creation with trial licenses
✅ Flexible RBAC with Owner, Counselor, Member system roles
✅ Custom role creation with permission management
✅ Member invitations with expiring tokens
✅ Permission-based endpoint protection
✅ Input validation with class-validator
✅ Frontend login/register pages
✅ Auth context and token management
✅ User menu and organization switcher UI
✅ Fresh start for authenticated users (no anonymous claiming)

**Total Tasks:** 12
**Estimated Time:** 8-12 hours for experienced developer
**Testing:** Unit tests for core services, manual integration tests
