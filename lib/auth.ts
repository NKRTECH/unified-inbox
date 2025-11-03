import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

// Validate required environment variables
const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required');
}

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
if (!baseURL && process.env.NODE_ENV === 'production') {
  throw new Error('BETTER_AUTH_URL is required in production');
}
const fallbackURL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : baseURL;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: authSecret,
  baseURL: fallbackURL!,
});
