import { Request } from 'express';
import { User } from '@mychristiancounselor/shared';

/**
 * Extended request interface with user and organization information.
 * The userOrganization property is attached by IsOrgAdminGuard.
 */
export interface RequestWithOrgAdmin extends Request {
  user: User;
  userOrganization: {
    id: string;
    name: string;
    isSystemOrganization: boolean;
  };
}
