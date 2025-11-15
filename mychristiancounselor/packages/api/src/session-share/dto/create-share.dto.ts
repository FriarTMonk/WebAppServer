export class CreateShareDto {
  sharedWith?: string; // email address
  organizationId?: string;
  expiresAt?: Date;
}
