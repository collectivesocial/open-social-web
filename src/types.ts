// ─── Shared type definitions for the OpenSocial Web frontend ──────────

export interface User {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

export interface Community {
  did: string;
  displayName: string;
  description?: string;
  avatar?: string;
  banner?: string;
  type?: 'open' | 'admin-approved' | 'private';
}

export interface CommunityDetails {
  community: Community & {
    admins?: string[];
    memberCount?: number;
    guidelines?: string;
  };
  memberCount: number;
  isAdmin: boolean;
  userRole?: string;
}

export interface Membership {
  uri: string;
  communityDid: string;
  joinedAt: string;
  status: 'active' | 'pending';
  community: Community;
  isOnlyAdmin?: boolean;
}

export interface AppInfo {
  app_id: string;
  name: string;
  domain: string;
  api_key: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  confirmedAt?: string;
  isAdmin?: boolean;
  roles?: { name: string; displayName: string }[];
}

// ─── Permissions & moderation types ───────────────────────────────────

export interface CommunitySettings {
  communityDid: string;
  communityType?: 'open' | 'admin-approved' | 'private';
  appVisibilityDefault: 'open' | 'approval_required';
  blockedAppIds: string[];
}

export interface AppVisibility {
  appId: string;
  appName: string | null;
  appDomain: string | null;
  status: 'enabled' | 'disabled' | 'pending';
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionPermission {
  collection: string;
  canCreate: string;
  canRead: string;
  canUpdate: string;
  canDelete: string;
}

export interface CommunityRole {
  name: string;
  displayName: string;
  description: string | null;
  visible: boolean;
  canViewAuditLog: boolean;
  createdAt: string;
}

export interface MemberRoleAssignment {
  roleName: string;
  assignedBy: string;
  assignedAt: string;
}

export interface AppDefaultPermission {
  collection: string;
  defaultCanCreate: string;
  defaultCanRead: string;
  defaultCanUpdate: string;
  defaultCanDelete: string;
}
