import { Injectable, BadRequestException } from '@nestjs/common';
import { OrganizationService } from '../organization/organization.service';
import { AdminService } from '../admin/admin.service';
import { AssignmentService } from '../counsel/assignment.service';
import { Permission, CreateCounselorAssignmentDto } from '@mychristiancounselor/shared';

@Injectable()
export class OrgAdminService {
  constructor(
    private organizationService: OrganizationService,
    private adminService: AdminService,
    private assignmentService: AssignmentService,
  ) {}

  /**
   * Create counselor assignment
   */
  async createCounselorAssignment(
    adminUserId: string,
    organizationId: string,
    dto: CreateCounselorAssignmentDto
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.MANAGE_MEMBERS
    );

    // Verify DTO has correct organizationId
    if (dto.organizationId !== organizationId) {
      throw new BadRequestException('Organization ID mismatch');
    }

    // Import AssignmentService and call it
    // Note: This requires injecting AssignmentService
    const assignment = await this.assignmentService.createAssignment(dto, adminUserId);

    // Log action
    await this.adminService.logAdminAction(
      adminUserId,
      'create_counselor_assignment',
      { counselorId: dto.counselorId, memberId: dto.memberId },
      undefined,
      organizationId
    );

    return assignment;
  }

  /**
   * Get all counselor assignments in organization
   */
  async getCounselorAssignments(
    adminUserId: string,
    organizationId: string
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.VIEW_MEMBERS
    );

    return this.assignmentService.getOrganizationAssignments(organizationId);
  }

  /**
   * End counselor assignment
   */
  async endCounselorAssignment(
    adminUserId: string,
    organizationId: string,
    assignmentId: string
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.MANAGE_MEMBERS
    );

    await this.assignmentService.endAssignment(assignmentId);

    // Log action
    await this.adminService.logAdminAction(
      adminUserId,
      'end_counselor_assignment',
      { assignmentId },
      undefined,
      organizationId
    );
  }

  /**
   * Get counselor workload stats
   */
  async getCounselorWorkloads(
    adminUserId: string,
    organizationId: string
  ) {
    // Verify admin has permission
    await this.organizationService.requirePermission(
      organizationId,
      adminUserId,
      Permission.VIEW_MEMBERS
    );

    return this.assignmentService.getCounselorWorkloads(organizationId);
  }
}
