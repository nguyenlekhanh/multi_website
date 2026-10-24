import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getPrisma } from '@/platform/data/prisma';
import { isDataUnavailableError } from '@/platform/data/errors';
import { verifyPasswordEqualized } from './password';

/**
 * Authentication (Auth.js / NextAuth v5).
 *
 * - Credentials provider backed by the admin_users table (bcrypt hashes,
 *   timing-equalized lookups — login failures are generic by design).
 * - JWT session strategy (required for credentials providers): the cookie is
 *   a signed, HttpOnly token; role and user id ride inside the signed token
 *   and are re-derived server-side on every request via `auth()`.
 * - No public registration: accounts exist only through the documented
 *   provisioning command (scripts/provision-admin.ts).
 * - Rate limiting lives in the login server action (needs caller IP headers).
 * - Uses the platform's single shared Prisma client — no second client.
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'SUPER_ADMIN' | 'SITE_ADMIN';
    } & DefaultSession['user'];
  }
  interface User {
    role: 'SUPER_ADMIN' | 'SITE_ADMIN';
  }
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/admin/login' },
  providers: [
    Credentials({
      name: 'Admin account',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password || password.length > 200 || email.length > 200) return null;

        try {
          const user = await getPrisma().adminUser.findUnique({ where: { email } });
          // Timing-equalized bcrypt comparison for unknown accounts.
          const valid = await verifyPasswordEqualized(password, user?.passwordHash ?? null);
          if (!user || !user.active || !valid) return null;

          return { id: user.id, email: user.email, name: user.name, role: user.role };
        } catch (error) {
          if (isDataUnavailableError(error)) throw error;
          // Lookup failure (DB down, validation error) → generic login failure.
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.uid as string) ?? '';
      session.user.role = (token.role as 'SUPER_ADMIN' | 'SITE_ADMIN') ?? 'SITE_ADMIN';
      return session;
    },
  },
});
