/**
 * Role Guard Component
 * 
 * Conditionally renders children based on user role and permissions
 */

'use client';

import { ReactNode } from 'react';
import { useRBAC } from '@/lib/hooks/useRBAC';
import { UserRole, Permission } from '@/lib/middleware/rbac';

interface RoleGuardProps {
  children: ReactNode;
  /** Require specific role or higher */
  requireRole?: UserRole;
  /** Require specific permission */
  requirePermission?: Permission;
  /** Fallback content when user doesn't have access */
  fallback?: ReactNode;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * ```tsx
 * // Require admin role
 * <RoleGuard requireRole={UserRole.ADMIN}>
 *   <AdminSettings />
 * </RoleGuard>
 * 
 * // Require write permission
 * <RoleGuard requirePermission="write">
 *   <CreateButton />
 * </RoleGuard>
 * 
 * // With fallback
 * <RoleGuard requireRole={UserRole.EDITOR} fallback={<p>Access denied</p>}>
 *   <EditorPanel />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  children,
  requireRole,
  requirePermission,
  fallback = null,
  showLoading = false,
}: RoleGuardProps) {
  const rbac = useRBAC();

  // Show loading state if requested
  if (showLoading && rbac.isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  // Check role requirement
  if (requireRole && !rbac.hasRole(requireRole)) {
    return <>{fallback}</>;
  }

  // Check permission requirement
  if (requirePermission && !rbac.hasPermission(requirePermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Shorthand components for common role checks
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requireRole={UserRole.ADMIN} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function EditorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requireRole={UserRole.EDITOR} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function WriteAccess({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requirePermission="write" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function DeleteAccess({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requirePermission="delete" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
