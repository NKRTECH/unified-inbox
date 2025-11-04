import { useSession } from '@/lib/auth-client';

export interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
}

export function useAuthStatus(): AuthStatus {
  const { data: session, isPending } = useSession();

  return {
    isAuthenticated: !!session?.user,
    isLoading: isPending,
    user: session?.user || null,
  };
}