'use client';

import React from 'react';
import type { AdminOrganizationMember as OrganizationMember } from '@mychristiancounselor/shared';

interface OrganizationMembersViewProps {
  members: OrganizationMember[];
  organizationId: string;
  organizationName: string;
  isPlatformAdmin?: boolean;
  onMemberClick: (member: OrganizationMember) => void;
}

export function OrganizationMembersView({
  members,
  organizationId,
  organizationName,
  isPlatformAdmin = false,
  onMemberClick,
}: OrganizationMembersViewProps) {
  /**
   * Determine background color based on role
   * Counselors: pale blue
   * Other users: pale green
   */
  const getMemberCardClasses = (roleName: string) => {
    const isCounselor = roleName === 'Counselor';

    const baseClasses = 'p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md';
    const colorClasses = isCounselor
      ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      : 'bg-green-50 border-green-200 hover:bg-green-100';

    return `${baseClasses} ${colorClasses}`;
  };

  /**
   * Get role badge color
   */
  const getRoleBadgeClasses = (roleName: string) => {
    switch (roleName) {
      case 'Owner':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Admin':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Counselor':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No members found in this organization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{organizationName}</h2>
        <p className="text-gray-600">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* Members Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div
            key={member.id}
            className={getMemberCardClasses(member.roleName)}
            onClick={() => onMemberClick(member)}
          >
            {/* Member Info */}
            <div className="space-y-2">
              {/* Name */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {member.firstName && member.lastName
                      ? `${member.firstName} ${member.lastName}`
                      : 'No name provided'}
                  </h3>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClasses(
                    member.roleName
                  )}`}
                >
                  {member.roleName}
                </span>
              </div>

              {/* Join Date */}
              <div className="text-xs text-gray-500">
                Joined {formatDate(member.joinedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
