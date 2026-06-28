import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/data/models/user.model";
import { env } from "@/env.mjs";
import { logger } from "@/lib/dev-logger";
import "next-auth/jwt";

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: "admin" | "user";
    };
  }

  interface User {
    role?: "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
  }
}

class AccessDeniedError extends CredentialsSignin {
  code = "AccessDenied";
}

// MongoDB client for Auth.js adapter
let resolvedPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (resolvedPromise) {
    return resolvedPromise;
  }

  resolvedPromise = (async () => {
    try {
      const { resolveMongoUri } = await import("@/lib/db");
      const resolvedUri = await resolveMongoUri(env.MONGODB_URI!);
      const client = new MongoClient(resolvedUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        tls: true,
        retryWrites: true,
      });
      await client.connect();
      return client;
    } catch (error) {
      logger.error("Auth helper failed to connect to MongoDB", error);
      throw error;
    }
  })();

  return resolvedPromise;
}

// A thenable object that acts as a lazy Promise to MongoClient.
// This prevents Next.js from eagerly initiating a connection on file import during the build phase.
const clientPromise = {
  then(onfulfilled?: any, onrejected?: any) {
    return getClientPromise().then(onfulfilled, onrejected);
  },
  catch(onrejected?: any) {
    return getClientPromise().catch(onrejected);
  },
  finally(onfinally?: any) {
    return getClientPromise().finally(onfinally);
  },
} as unknown as Promise<MongoClient>;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectToDatabase();

        const normalizedEmail = (credentials.email as string)
          .trim()
          .toLowerCase();
        const inputPassword = credentials.password as string;

        const user = await UserModel.findOne({
          email: normalizedEmail,
        })
          .select("+password")
          .lean();

        if (!user || !user.password) {
          return null;
        }

        let isPasswordValid = false;

        if (isBcryptHash(user.password)) {
          isPasswordValid = await bcrypt.compare(inputPassword, user.password);
        } else {
          // Backward compatibility for legacy records that stored plaintext.
          isPasswordValid = inputPassword === user.password;

          if (isPasswordValid) {
            const migratedHash = await bcrypt.hash(inputPassword, 12);
            await UserModel.updateOne(
              { _id: user._id },
              { $set: { password: migratedHash } },
            );
          }
        }

        if (!isPasswordValid) {
          return null;
        }

        // We no longer block "user" role here so they can login and be redirected
        // to the request-access page.
        // if (user.role === "user") {
        //   throw new AccessDeniedError();
        // }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as Record<string, unknown>)
          .role as string;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
});
