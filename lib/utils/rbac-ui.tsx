/**
 * RBAC UI Utilities
 * 
 * React components and hooks for role-based UI rendering
 */

'use client';

import { ReactNode } from 'react';
import { UserRole, Permission, hasPermission, hasRole } from '@/lib/middleware/rbac';

/**
 * Props for role-based components
 */
interface RoleBasedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RequireRoleProps extends RoleBasedProps {
  role: UserRole;
  userRole: UserRole;
}

interface RequirePermissionProps extends RoleBasedProps {
  permission: Permission;
  userRole: UserRole;
}

/**
 * Component that renders children only if user has required role
 * 
 * @example
 * ```tsx
 * <RequireRole role={UserRole.ADMIN} userRole={currentUser.role}>
 *   <AdminPanel />
 * </RequireRole>
 * ```
 */
export function RequireRole({
  role,
  userRole,
  children,
  fallback = null,
}: RequireRoleProps) {
  if (!hasRole(userRole, role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only if user has required permission
 * 
 * @example
 * ```tsx
 * <RequirePermission permission="write" userRole={currentUser.role}>
 *   <EditButton />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  permission,
  userRole,
  children,
  fallback = null,
}: RequirePermissionProps) {
  if (!hasPermission(userRole, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component that renders children only for admin users
 * 
 * @example
 * ```tsx
 * <AdminOnly userRole={currentUser.role}>
 *   <DeleteButton />
 * </AdminOnly>
 * ```
 */
export function AdminOnly({
  userRole,
  children,
  fallback = null,
}: Omit<RequireRoleProps, 'role'>) {
  return (
    <RequireRole role={UserRole.ADMIN} userRole={userRole} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

/**
 * Component that renders children only for editor or admin users
 * 
 * @example
 * ```tsx
 * <EditorOrAbove userRole={currentUser.role}>
 *   <CreateButton />
 * </EditorOrAbove>
 * ```
 */
export function EditorOrAbove({
  userRole,
  children,
  fallback = null,
}: Omit<RequireRoleProps, 'role'>) {
  return (
    <RequireRole role={UserRole.EDITOR} userRole={userRole} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

/**
 * Hook to check if user has required role
 * 
 * @example
 * ```tsx
 * const isAdmin = useHasRole(currentUser.role, UserRole.ADMIN);
 * ```
 */
export function useHasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return hasRole(userRole, requiredRole);
}

/**
 * Hook to check if user has required permission
 * 
 * @example
 * ```tsx
 * const canWrite = useHasPermission(currentUser.role, 'write');
 * ```
 */
export function useHasPermission(userRole: UserRole, permission: Permission): boolean {
  return hasPermission(userRole, permission);
}

/**
 * Hook to get user capabilities
 * 
 * @example
 * ```tsx
 * const { canRead, canWrite, canDelete, isAdmin } = useUserCapabilities(currentUser.role);
 * ```
 */
export function useUserCapabilities(userRole: UserRole) {
  return {
    canRead: hasPermission(userRole, 'read'),
    canWrite: hasPermission(userRole, 'write'),
    canDelete: hasPermission(userRole, 'delete'),
    isAdmin: hasPermission(userRole, 'admin'),
    isEditor: hasRole(userRole, UserRole.EDITOR),
    isViewer: userRole === UserRole.VIEWER,
  };
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    [UserRole.VIEWER]: 'Viewer',
    [UserRole.EDITOR]: 'Editor',
    [UserRole.ADMIN]: 'Administrator',
  };

  return displayNames[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    [UserRole.VIEWER]: 'Can view conversations and contacts',
    [UserRole.EDITOR]: 'Can view and create messages, notes, and contacts',
    [UserRole.ADMIN]: 'Full access to all features and settings',
  };

  return descriptions[role];
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.VIEWER]: 'bg-gray-100 text-gray-800',
    [UserRole.EDITOR]: 'bg-blue-100 text-blue-800',
    [UserRole.ADMIN]: 'bg-purple-100 text-purple-800',
  };

  return colors[role];
}
