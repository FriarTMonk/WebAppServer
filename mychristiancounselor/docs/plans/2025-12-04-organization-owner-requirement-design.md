# Organization Owner Requirement Design

**Date:** 2025-12-04
**Status:** Approved for Implementation

## Problem Statement

Organizations created by platform admins have no initial owner/members, making them inaccessible via org-admin screens. Additionally, there's architectural inconsistency between two role systems:
- User-created orgs use platform roles from System Organization
- Admin-created orgs create org-specific roles but don't add members

This causes org-admin screens (Members, Counselor Assignments) to fail with 403 errors due to the `IsOrgAdminGuard` finding no Owner/Admin members.

## Root Causes

1. `admin.service.ts` `createOrganization` method creates roles but never adds members
2. Two conflicting role architectures causing confusion
3. No validation requiring organizations to have at least one owner

## Design Decision

**Standardize on org-specific roles** - Each organization has its own role definitions for maximum flexibility.

**Require owner email for all organization creation** - Every organization must have an identified owner from creation.

## Solution Architecture

### Part 1: Fix Admin Organization Creation

**API Changes (`admin.service.ts`):**
```typescript
async createOrganization(
  adminUserId: string,
  data: {
    name: string;
    description?: string;
    ownerEmail: string;  // NEW: Required
    licenseType?: string;
    licenseStatus?: string;
    maxMembers?: number;
  },
): Promise<any>
```

**Implementation logic:**
1. Validate ownerEmail format
2. Create organization
3. Create org-specific roles (Owner, Admin, Counselor, Member)
4. Look up user by email:
   - **If user exists**: Create organizationMember record immediately
   - **If user doesn't exist**: Create pending invitation
5. Send email notification to owner
6. Log admin action
7. Return organization with owner info

**Benefits:**
- Guarantees every organization has an owner
- Enables immediate org-admin access for existing users
- Graceful handling for non-existent users via invitations

### Part 2: Migrate User Organization Creation

**Update `organization.service.ts`:**
1. Remove dependency on platform roles from System Organization
2. Create org-specific roles inline (same structure as admin flow)
3. Add creator as owner with newly created org role
4. Maintain backward compatibility during transition

**Role creation logic to extract:**
```typescript
private async createOrgRoles(organizationId: string): Promise<{
  owner: OrganizationRole;
  admin: OrganizationRole;
  counselor: OrganizationRole;
  member: OrganizationRole;
}>
```

### Part 3: Frontend Updates

**Admin organization creation form (`packages/web`):**
- Add required "Owner Email" field
- Validate email format client-side
- Show clear messaging: "An invitation will be sent to this email"
- Display success message with owner invitation status

### Part 4: Data Migration

**Migration script needed for existing organizations:**
1. Identify orgs using platform roles (roleId references System Org roles)
2. Create org-specific roles for those organizations
3. Update organizationMember records to reference new org-specific roles
4. Verify all organizations have at least one Owner or Admin
5. Log migration results

## Implementation Tasks

1. **Backend - Admin Flow**
   - Update `CreateOrganizationDto` to require `ownerEmail`
   - Update `admin.service.ts` `createOrganization` method
   - Add owner lookup and member/invitation creation logic
   - Add email notification

2. **Backend - User Flow**
   - Extract role creation logic to shared method
   - Update `organization.service.ts` to create org-specific roles
   - Remove platform role dependencies

3. **Frontend - Admin UI**
   - Update admin organization creation form
   - Add ownerEmail field with validation
   - Update success messaging

4. **Migration**
   - Create migration script for existing organizations
   - Test on staging data
   - Document rollback procedure

5. **Testing**
   - Test admin-created org with existing user email
   - Test admin-created org with new user email
   - Test user-created org still works
   - Verify org-admin screens accessible after creation
   - Test migration script

## Success Criteria

- [ ] All newly created organizations have at least one owner
- [ ] Org-admin screens (Members, Counselor Assignments) load successfully
- [ ] Both admin and user organization creation flows work
- [ ] Existing organizations migrated to org-specific roles
- [ ] Email notifications sent to new owners
- [ ] No breaking changes to existing functionality

## Risks and Mitigations

**Risk:** Migration might fail for some organizations
**Mitigation:** Run migration in transaction, comprehensive logging, rollback script

**Risk:** Breaking change for API consumers
**Mitigation:** Version API if needed, clear documentation of changes

**Risk:** Email invitations might not be received
**Mitigation:** Show pending invitation in admin UI, allow resending

## Future Enhancements

- Allow specifying multiple initial owners/admins
- Bulk organization creation with CSV
- Owner transfer functionality
- Automatic owner assignment if email not provided (fallback to admin)
