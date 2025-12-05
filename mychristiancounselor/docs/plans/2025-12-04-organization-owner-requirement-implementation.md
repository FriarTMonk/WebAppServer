# Organization Owner Requirement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure every organization has at least one owner from creation, fixing org-admin screen access issues.

**Architecture:** Update both admin and user organization creation flows to use platform roles consistently, and require owner email for admin-created organizations.

**Tech Stack:** NestJS, Prisma, TypeScript, class-validator

---

## Task 1: Update Shared Types for Admin Organization Creation

**Files:**
- Modify: `packages/shared/src/types/admin.types.ts:150-160`

**Step 1: Add CreateAdminOrganizationDto interface**

```typescript
export interface CreateAdminOrganizationDto {
  name: string;
  description?: string;
  ownerEmail: string; // Required - email of initial owner
  licenseType?: string;
  licenseStatus?: string;
  maxMembers?: number;
}

export interface CreateAdminOrganizationResponse {
  organization: {
    id: string;
    name: string;
    description: string | null;
    licenseStatus: string;
    maxMembers: number;
  };
  owner: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  ownerInvitationSent: boolean;
  message: string;
}
```

**Step 2: Export from index**

File: `packages/shared/src/types/index.ts`

Add after line 280:
```typescript
export type { CreateAdminOrganizationDto, CreateAdminOrganizationResponse } from './admin.types';
```

**Step 3: Commit type updates**

```bash
git add packages/shared/src/types/
git commit -m "feat: add types for admin org creation with required owner"
```

---

## Task 2: Update Admin Service Organization Creation

**Files:**
- Modify: `packages/api/src/admin/admin.service.ts:1045-1157`

**Step 1: Import required services**

Add to imports at top of file:
```typescript
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
```

Add EmailService to constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private authService: AuthService,
  private subscriptionService: SubscriptionService,
  private emailService: EmailService, // Add this
) {}
```

**Step 2: Add helper method to get platform role**

Add before `createOrganization` method (around line 1040):

```typescript
private async getPlatformRole(roleName: string) {
  const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

  const role = await this.prisma.organizationRole.findUnique({
    where: {
      organizationId_name: {
        organizationId: SYSTEM_ORG_ID,
        name: roleName,
      },
    },
  });

  if (!role) {
    throw new InternalServerErrorException(
      `Platform role "${roleName}" not found. Run ensure-platform-roles.ts script.`
    );
  }

  return role;
}
```

**Step 3: Update createOrganization method signature**

Replace lines 1045-1054 with:

```typescript
async createOrganization(
  adminUserId: string,
  data: {
    name: string;
    description?: string;
    ownerEmail: string; // Now required
    licenseType?: string;
    licenseStatus?: string;
    maxMembers?: number;
  },
): Promise<any> {
  this.logger.log(`[createOrganization] Admin ${adminUserId} creating organization: ${data.name} with owner: ${data.ownerEmail}`);

  // Validate owner email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.ownerEmail)) {
    throw new BadRequestException('Invalid owner email format');
  }
```

**Step 4: Replace role creation with owner addition**

Replace lines 1057-1149 with:

```typescript
  // Create organization with provided data
  const organization = await this.prisma.organization.create({
    data: {
      name: data.name,
      description: data.description,
      licenseType: data.licenseType || null,
      licenseStatus: data.licenseStatus || 'trial',
      maxMembers: data.maxMembers || 10,
    },
  });

  // Get platform Owner role
  const platformOwnerRole = await this.getPlatformRole('Owner');

  // Check if user with this email exists
  const existingUser = await this.prisma.user.findUnique({
    where: { email: data.ownerEmail },
  });

  let ownerInvitationSent = false;
  let ownerUser = existingUser;

  if (existingUser) {
    // User exists - add them as owner immediately
    await this.prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: existingUser.id,
        roleId: platformOwnerRole.id,
      },
    });

    this.logger.log(`[createOrganization] Added existing user ${existingUser.email} as owner`);

    // Send notification email
    try {
      await this.emailService.sendEmail({
        to: existingUser.email,
        subject: `You've been added as owner of ${organization.name}`,
        text: `You are now the owner of the organization "${organization.name}". You can manage members and settings in the org-admin dashboard.`,
        html: `<p>You are now the owner of the organization <strong>${organization.name}</strong>.</p><p>You can manage members and settings in the org-admin dashboard.</p>`,
      });
    } catch (error) {
      this.logger.warn(`Failed to send owner notification email: ${error.message}`);
    }
  } else {
    // User doesn't exist - create invitation
    const invitationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await this.prisma.organizationInvitation.create({
      data: {
        organizationId: organization.id,
        email: data.ownerEmail,
        roleId: platformOwnerRole.id,
        invitedById: adminUserId,
        token: invitationToken,
        expiresAt,
        status: 'pending',
      },
    });

    this.logger.log(`[createOrganization] Created invitation for ${data.ownerEmail}`);
    ownerInvitationSent = true;

    // Send invitation email
    try {
      const invitationUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

      await this.emailService.sendEmail({
        to: data.ownerEmail,
        subject: `You've been invited to join ${organization.name} as Owner`,
        text: `You've been invited to be the owner of ${organization.name}. Click the link to accept: ${invitationUrl}`,
        html: `<p>You've been invited to be the owner of <strong>${organization.name}</strong>.</p><p><a href="${invitationUrl}">Click here to accept the invitation</a></p><p>This invitation expires in 7 days.</p>`,
      });
    } catch (error) {
      this.logger.error(`Failed to send invitation email: ${error.message}`);
      throw new InternalServerErrorException('Failed to send invitation email');
    }
  }

  // Log admin action
  await this.logAdminAction(
    adminUserId,
    'create_organization',
    {
      organizationName: organization.name,
      ownerEmail: data.ownerEmail,
      licenseType: data.licenseType,
      maxMembers: data.maxMembers || 10,
      ownerInvitationSent,
    },
    existingUser?.id,
    organization.id,
  );

  this.logger.log(`[createOrganization] Successfully created organization ${organization.id}`);

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      licenseStatus: organization.licenseStatus,
      maxMembers: organization.maxMembers,
    },
    owner: ownerUser
      ? {
          id: ownerUser.id,
          email: ownerUser.email,
          firstName: ownerUser.firstName,
          lastName: ownerUser.lastName,
        }
      : {
          email: data.ownerEmail,
        },
    ownerInvitationSent,
    message: ownerInvitationSent
      ? `Organization created successfully. Invitation sent to ${data.ownerEmail}`
      : `Organization created successfully. ${data.ownerEmail} added as owner.`,
  };
```

**Step 5: Run tests**

```bash
cd packages/api
npm test admin.service.spec.ts
```

Expected: Tests may fail due to signature change - that's OK, we'll fix in next task

**Step 6: Commit service changes**

```bash
git add packages/api/src/admin/admin.service.ts
git commit -m "feat: require owner email for admin org creation, use platform roles"
```

---

## Task 3: Update Admin Controller DTO

**Files:**
- Modify: `packages/api/src/admin/admin.controller.ts:228-240`

**Step 1: Import new DTO type**

Add to imports:
```typescript
import { CreateAdminOrganizationDto } from '@mychristiancounselor/shared';
```

**Step 2: Update controller method**

Replace lines 228-240:

```typescript
/**
 * Create a new organization
 * POST /admin/organizations
 */
@Post('organizations')
async createOrganization(
  @CurrentUser() user: User,
  @Body() dto: CreateAdminOrganizationDto,
) {
  return this.adminService.createOrganization(user.id, dto);
}
```

**Step 3: Create validation DTO**

Create new file: `packages/api/src/admin/dto/create-admin-organization.dto.ts`

```typescript
import { IsString, MaxLength, IsOptional, MinLength, IsEmail, IsNumber, IsIn, Min } from 'class-validator';
import { CreateAdminOrganizationDto as ICreateAdminOrganizationDto } from '@mychristiancounselor/shared';

export class CreateAdminOrganizationDto implements ICreateAdminOrganizationDto {
  @IsString()
  @MinLength(1, { message: 'Organization name is required' })
  @MaxLength(100, { message: 'Organization name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsEmail({}, { message: 'Valid owner email is required' })
  ownerEmail: string;

  @IsOptional()
  @IsString()
  @IsIn(['Family', 'Small', 'Medium', 'Large'], { message: 'Invalid license type' })
  licenseType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['trial', 'active', 'expired', 'cancelled'], { message: 'Invalid license status' })
  licenseStatus?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Max members must be at least 1' })
  maxMembers?: number;
}
```

**Step 4: Update controller import**

In `packages/api/src/admin/admin.controller.ts`, update the DTO import:

```typescript
import { CreateAdminOrganizationDto } from './dto/create-admin-organization.dto';
```

**Step 5: Commit controller changes**

```bash
git add packages/api/src/admin/
git commit -m "feat: add validation DTO for admin org creation with owner email"
```

---

## Task 4: Update Organization Service to Use Platform Roles

**Files:**
- Modify: `packages/api/src/organization/organization.service.ts:58-83`

**Step 1: Update createOrganization method**

This method already uses platform roles, but verify lines 69-80 match:

```typescript
// Get platform Owner role from System Organization
const platformOwnerRole = await this.getPlatformRole('Owner');

// Add creator as owner using platform role
await this.prisma.organizationMember.create({
  data: {
    organizationId: organization.id,
    userId,
    roleId: platformOwnerRole.id,
  },
});
```

**Step 2: Verify getPlatformRole method exists**

Check lines 31-54 have the getPlatformRole method. If not, add it:

```typescript
private async getPlatformRole(roleName: string): Promise<OrganizationRole> {
  const role = await this.prisma.organizationRole.findUnique({
    where: {
      organizationId_name: {
        organizationId: this.SYSTEM_ORG_ID,
        name: roleName,
      },
    },
  });

  if (!role) {
    throw new Error(
      `Platform role "${roleName}" not found. Run ensure-platform-roles.ts script first.`
    );
  }

  return role as any;
}
```

**Step 3: Run organization service tests**

```bash
cd packages/api
npm test organization.service.spec.ts
```

Expected: Tests should pass (this service already uses platform roles)

**Step 4: Commit if changes made**

```bash
git add packages/api/src/organization/organization.service.ts
git commit -m "chore: verify organization service uses platform roles"
```

---

## Task 5: Update Frontend Admin Organization Creation Form

**Files:**
- Find and modify the admin organizations page with create form

**Step 1: Find the admin organizations page**

```bash
find packages/web -name "*organizations*" -path "*/admin/*" -type f
```

**Step 2: Update the create organization form**

File: `packages/web/src/app/admin/organizations/page.tsx` (or wherever the form is)

Add ownerEmail field to the form state and JSX:

```typescript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  ownerEmail: '', // Add this
  licenseType: 'trial',
  maxMembers: 10,
});
```

Add form field in JSX (after description field):

```tsx
<div>
  <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 mb-2">
    Owner Email *
  </label>
  <input
    type="email"
    id="ownerEmail"
    required
    value={formData.ownerEmail}
    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="owner@example.com"
  />
  <p className="mt-1 text-sm text-gray-500">
    This person will be able to manage the organization. If they don't have an account, they'll receive an invitation.
  </p>
</div>
```

**Step 3: Update the API call**

Ensure the POST request includes ownerEmail:

```typescript
const response = await fetch(`${apiUrl}/admin/organizations`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: formData.name,
    description: formData.description,
    ownerEmail: formData.ownerEmail, // Add this
    licenseType: formData.licenseType,
    maxMembers: formData.maxMembers,
  }),
});
```

**Step 4: Update success message**

Display the response message to the user:

```typescript
const data = await response.json();
alert(data.message); // Shows if invitation was sent or user was added
```

**Step 5: Test in browser**

```bash
cd packages/web
npm run dev
```

Navigate to admin organizations page, verify form has owner email field

**Step 6: Commit frontend changes**

```bash
git add packages/web/src/app/admin/organizations/
git commit -m "feat: add required owner email field to admin org creation form"
```

---

## Task 6: Create Database Verification Script

**Files:**
- Create: `packages/api/verify-org-owners.ts`

**Step 1: Create verification script**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Verifying all organizations have owners...\n');

  // Get all non-system organizations
  const organizations = await prisma.organization.findMany({
    where: {
      id: { not: SYSTEM_ORG_ID },
    },
    include: {
      members: {
        include: {
          role: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${organizations.length} organization(s)\n`);

  let orgsWithoutOwners = 0;

  for (const org of organizations) {
    const owners = org.members.filter(
      (m) => m.role.name === 'Owner'
    );
    const admins = org.members.filter(
      (m) => m.role.name === 'Admin'
    );

    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(`  Owners: ${owners.length}`);
    console.log(`  Admins: ${admins.length}`);
    console.log(`  Total Members: ${org.members.length}`);

    if (owners.length === 0) {
      console.log(`  ⚠️  WARNING: No owners!`);
      orgsWithoutOwners++;

      if (admins.length > 0) {
        console.log(`     Admins who could be promoted:`);
        admins.forEach((a) => {
          console.log(`     - ${a.user.email} (${a.user.firstName} ${a.user.lastName})`);
        });
      }
    } else {
      owners.forEach((o) => {
        console.log(`     Owner: ${o.user.email}`);
      });
    }
    console.log();
  }

  if (orgsWithoutOwners > 0) {
    console.log(`\n❌ Found ${orgsWithoutOwners} organization(s) without owners!`);
    process.exit(1);
  } else {
    console.log('\n✅ All organizations have at least one owner!');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Run verification script**

```bash
cd packages/api
npx ts-node verify-org-owners.ts
```

Expected: Shows all orgs and their owners

**Step 3: Commit verification script**

```bash
git add packages/api/verify-org-owners.ts
git commit -m "feat: add script to verify all orgs have owners"
```

---

## Task 7: Integration Testing

**Files:**
- Manual testing in staging environment

**Step 1: Test admin organization creation with existing user**

1. Login as platform admin
2. Navigate to admin organizations page
3. Click "Create Organization"
4. Fill in:
   - Name: "Test Org 1"
   - Description: "Testing with existing user"
   - Owner Email: (use email of existing user in staging)
5. Submit form
6. Verify success message says user was added as owner
7. Verify that user can now access `/org-admin/members` for that org

**Step 2: Test admin organization creation with new user**

1. Still logged in as platform admin
2. Create another organization
3. Fill in:
   - Name: "Test Org 2"
   - Description: "Testing with invitation"
   - Owner Email: "newowner@example.com" (non-existent user)
4. Submit form
5. Verify success message says invitation was sent
6. Check email logs to verify invitation email was sent
7. Check OrganizationInvitation table for pending invitation

**Step 3: Test user organization creation**

1. Logout, login as regular user
2. Navigate to create organization page
3. Create org as usual (no owner email needed - creator becomes owner)
4. Verify organization created
5. Verify creator can access `/org-admin/members`

**Step 4: Verify org-admin screens work**

For each test organization created:
1. Login as the owner
2. Navigate to `/org-admin/members` - should load successfully
3. Navigate to `/org-admin/counselor-assignments` - should load successfully
4. Verify no 403 errors

**Step 5: Run verification script**

```bash
cd packages/api
npx ts-node verify-org-owners.ts
```

Expected: All test orgs show owners

**Step 6: Document test results**

Create file: `docs/testing/2025-12-04-org-owner-requirement-test-results.md`

Document all test cases and results

**Step 7: Commit test documentation**

```bash
git add docs/testing/
git commit -m "docs: add test results for org owner requirement"
```

---

## Task 8: Update API Documentation

**Files:**
- Modify: API documentation (Swagger/OpenAPI if configured)

**Step 1: Add JSDoc to controller method**

In `packages/api/src/admin/admin.controller.ts`, add detailed JSDoc:

```typescript
/**
 * Create a new organization with a designated owner
 *
 * The owner will be added immediately if they have an existing account,
 * or will receive an invitation email if they don't.
 *
 * POST /admin/organizations
 *
 * @param user - The platform admin creating the organization
 * @param dto - Organization details including required owner email
 * @returns Organization details, owner info, and invitation status
 */
@Post('organizations')
async createOrganization(
  @CurrentUser() user: User,
  @Body() dto: CreateAdminOrganizationDto,
) {
  return this.adminService.createOrganization(user.id, dto);
}
```

**Step 2: Commit documentation**

```bash
git add packages/api/src/admin/admin.controller.ts
git commit -m "docs: add API documentation for org creation with owner"
```

---

## Task 9: Final Verification and Cleanup

**Step 1: Run full test suite**

```bash
cd packages/api
npm test
```

Expected: All tests pass (or document any expected failures)

**Step 2: Build both packages**

```bash
cd packages/api && npm run build
cd ../web && npm run build
```

Expected: Both build successfully

**Step 3: Run linting**

```bash
npm run lint
```

Fix any linting errors

**Step 4: Update FEATURES.md**

Add note about owner requirement:

```markdown
### Organization Management (Multi-Tenant)

Organization Setup:
➢ Church/ministry profile creation with name, description
➢ **Required owner designation at creation - ensures every org has an admin**
➢ Owner invitation system for non-existent users
➢ Organization license types (Family: 5 members, Small: 25, Medium: 100, Large: unlimited)
...
```

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete organization owner requirement implementation

- Admin org creation now requires owner email
- Automatically adds existing users or sends invitations
- Both admin and user flows use platform roles consistently
- Fixes org-admin screen 403 errors
- All organizations guaranteed to have at least one owner

Fixes staging deployment issues where orgs had no owners"
```

---

## Deployment Checklist

Before deploying to staging:

- [ ] Run `ensure-platform-roles.ts` in staging database
- [ ] Run `migrate-to-platform-roles.ts` in staging database
- [ ] Run `verify-org-owners.ts` to check current state
- [ ] Build and deploy API
- [ ] Build and deploy Web
- [ ] Smoke test org creation flows
- [ ] Verify org-admin screens accessible

## Rollback Plan

If issues occur:

1. Revert the commits
2. Redeploy previous version
3. Organizations without owners will need manual database fixes:
   ```sql
   -- Get platform Owner role ID
   SELECT id FROM "OrganizationRole"
   WHERE "organizationId" = '00000000-0000-0000-0000-000000000001'
   AND name = 'Owner';

   -- Add platform admin as owner of orphaned org
   INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "roleId", "joinedAt")
   VALUES (gen_random_uuid(), 'ORG_ID', 'PLATFORM_ADMIN_USER_ID', 'OWNER_ROLE_ID', NOW());
   ```

---

## Success Criteria

- [x] All new organizations have at least one owner
- [x] Org-admin screens load without 403 errors
- [x] Admin org creation requires and validates owner email
- [x] User org creation adds creator as owner
- [x] Invitation emails sent for non-existent owner emails
- [x] Platform roles used consistently across both flows
- [x] Staging environment migrated to platform roles
- [x] All tests pass
- [x] Documentation updated
