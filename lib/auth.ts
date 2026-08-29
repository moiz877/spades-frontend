import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import type { CompanyDocument, UserDocument } from './types';

// Credentials-provider auth deliberately does NOT use the Mongo adapter --
// NextAuth's own docs recommend against combining them, since the adapter
// is built around OAuth account linking. Sessions are JWT-based instead,
// and users/companies live in our own collections, looked up directly in
// authorize() below. _id fields are real ObjectIds at rest; they're
// converted to strings the moment they cross into the JWT/session, and
// back to ObjectId whenever queried again.
export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const db = await getDb();
        const user = await db
          .collection<UserDocument>('users')
          .findOne({ email: credentials.email.toLowerCase() });
        if (!user) return null;

        const passwordValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!passwordValid) return null;

        const company = await db
          .collection<CompanyDocument>('companies')
          .findOne({ _id: user.company_id });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          companyId: user.company_id.toString(),
          companyName: company?.name ?? '',
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.companyId = token.companyId;
      session.user.companyName = token.companyName;
      session.user.role = token.role;
      return session;
    },
  },
};

/** Helper for API routes: parse a string id back into an ObjectId for queries. */
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}
