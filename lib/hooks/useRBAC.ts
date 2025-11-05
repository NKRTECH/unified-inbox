/**
 * RBAC Hook for Frontend
 * 
 * Provides role-based access control utilities for UI components
 */

import { useSession } from '@/lib/auth-client';
import { UserRole, hasPermission, hasRole, Permission } from '@/lib/middleware/rbac';

export interface RBACHookReturn {
  /** Current user role */
  role: UserRole | null;
  /** Check if user can read resources */
  canRead: boolean;
  /** Check if user can write/create resources */
  canWrite: boolean;
  /** Check if user can delete resources */
  canDelete: boolean;
  /** Check if user has admin privileges */
  isAdmin: boolean;
  /** Check if user is editor or higher */
  isEditor: boolean;
  /** Check if user is viewer */
  isViewer: boolean;
  /** Check if user has specific permission */
  hasPermission: (permission: Permission) => boolean;
  /** Check if user has specific role or higher */
  hasRole: (role: UserRole) => boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to check user permissions and roles
 * 
 * @example
 * ```tsx
 * const { canWrite, isAdmin } = useRBAC();
 * 
 * return (
 *   <>
 *     {canWrite && <button>Create Contact</button>}
 *     {isAdmin && <Link href="/settings">Admin Settings</Link>}
 *   </>
 * );
 * ```
 */
export function useRBAC(): RBACHookReturn {
  const { data: session, isPending } = useSession();
  const userRole = (session?.user?.role as UserRole) || null;

  // If no role, user has no permissions
  if (!userRole) {
    return {
      role: null,
      canRead: false,
      canWrite: false,
      canDelete: false,
      isAdmin: false,
      isEditor: false,
      isViewer: false,
      hasPermission: () => false,
      hasRole: () => false,
      isLoading: isPending,
    };
  }

  return {
    role: userRole,
    canRead: hasPermission(userRole, 'read'),
    canWrite: hasPermission(userRole, 'write'),
    canDelete: hasPermission(userRole, 'delete'),
    isAdmin: hasRole(userRole, UserRole.ADMIN),
    isEditor: hasRole(userRole, UserRole.EDITOR),
    isViewer: userRole === UserRole.VIEWER,
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasRole: (role: UserRole) => hasRole(userRole, role),
    isLoading: isPending,
  };
}
