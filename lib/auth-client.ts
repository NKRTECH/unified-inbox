import { createAuthClient } from "better-auth/react";

// Validate auth URL for client-side usage
const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
if (!baseURL && process.env.NODE_ENV === 'production') {
  throw new Error('BETTER_AUTH_URL or NEXT_PUBLIC_BETTER_AUTH_URL is required in production');
}
const fallbackURL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : baseURL;

export const authClient = createAuthClient({
  baseURL: fallbackURL!,
});

export const { signIn, signUp, signOut, useSession } = authClient;
