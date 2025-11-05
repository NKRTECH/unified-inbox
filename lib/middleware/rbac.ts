/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides middleware functions and utilities for enforcing role-based permissions
 * across API routes and UI components.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * User roles in order of privilege level
 */
export enum UserRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

/**
 * Permission levels for different operations
 */
export type Permission = 
  | 'read'
  | 'write'
  | 'delete'
  | 'admin';

/**
 * Role permission matrix
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.VIEWER]: ['read'],
  [UserRole.EDITOR]: ['read', 'write'],
  [UserRole.ADMIN]: ['read', 'write', 'delete', 'admin'],
};

/**
 * Session user type
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(
  userRole: UserRole,
  requiredPermission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes(requiredPermission);
}

/**
 * Check if user has required role (or higher)
 */
export function hasRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const roleHierarchy = [UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  return { user };
}

/**
 * Middleware to require specific permission
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<{ user: SessionUser } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  if (!hasPermission(user.role, permission)) {
    return NextResponse.json(
      {
        error: 'Forbidden - Insufficient permissions',
        required: permission,
        current: ROLE_PERMISSIONS[user.role],
      },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Middleware to require specific role (or higher)
 */
export async function requireRole(
  request: NextRequest,
  role: UserRole
): Promise<{ user: SessionUser } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  if (!hasRole(user.role, role)) {
    return NextResponse.json(
      {
        error: 'Forbidden - Insufficient role',
        required: role,
        current: user.role,
      },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: SessionUser } | NextResponse> {
  return requireRole(request, UserRole.ADMIN);
}

/**
 * Middleware to require editor role or higher
 */
export async function requireEditor(
  request: NextRequest
): Promise<{ user: SessionUser } | NextResponse> {
  return requireRole(request, UserRole.EDITOR);
}

/**
 * Check if user can perform action on resource
 * This can be extended with resource-specific logic
 */
export function canAccessResource(
  user: SessionUser,
  resourceOwnerId?: string,
  requiredPermission: Permission = 'read'
): boolean {
  // Admins can access everything
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Check if user has the required permission
  if (!hasPermission(user.role, requiredPermission)) {
    return false;
  }

  // If resource has an owner, check if user is the owner
  // or has sufficient permissions
  if (resourceOwnerId) {
    if (user.id === resourceOwnerId) {
      return true;
    }

    // Editors can access resources they don't own for read/write
    if (user.role === UserRole.EDITOR && requiredPermission !== 'delete') {
      return true;
    }

    return false;
  }

  return true;
}
