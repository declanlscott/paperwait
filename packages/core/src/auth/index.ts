import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";

import { db } from "../drizzle";
import { users } from "../user/sql";
import { generateId } from "../utils/helpers";
import { sessions, sessionsTokens } from "./sql";

import type {
  Session as LuciaSession,
  User as LuciaUser,
  RegisteredDatabaseSessionAttributes,
} from "lucia";
import type { OAuth2Tokens } from "../oauth2/tokens";
import type { Organization } from "../organization/sql";
import type { User } from "../user/sql";
import type { Session, SessionsTokens } from "./sql";

export type Auth = {
  session: LuciaSession | null;
  user: LuciaUser | null;
  org: Pick<Organization, "id" | "slug" | "status"> | null;
};

export type Authenticated = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true };

export type Unauthenticated = {
  [TKey in keyof Auth]: null;
} & { isAuthed: false };

export const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: { secure: (process.env.PROD ?? "false") === "true" },
  },
  getUserAttributes: (attributes) => ({
    oAuth2UserId: attributes.oAuth2UserId,
    orgId: attributes.orgId,
    name: attributes.name,
    role: attributes.role,
    email: attributes.email,
    username: attributes.username,
  }),
  getSessionAttributes: (attributes) => ({
    orgId: attributes.orgId,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<User, "id">;
    DatabaseSessionAttributes: Pick<Session, "orgId">;
  }
}

export type { User as LuciaUser, Session as LuciaSession } from "lucia";

export async function createSession(
  userId: LuciaUser["id"],
  attributes: RegisteredDatabaseSessionAttributes,
  tokens: OAuth2Tokens,
) {
  const session = await db.transaction(async (tx) => {
    const session = await lucia.createSession(userId, attributes, {
      sessionId: generateId(),
    });

    const sessionTokens = {
      idToken: tokens.idToken(),
      accessToken: tokens.accessToken(),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt(),
      refreshToken: tokens.refreshToken(),
    } satisfies Pick<
      SessionsTokens,
      "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
    >;

    await tx
      .insert(sessionsTokens)
      .values({
        sessionId: session.id,
        userId,
        orgId: attributes.orgId,
        ...sessionTokens,
      })
      .onConflictDoUpdate({
        target: [sessionsTokens.sessionId],
        set: sessionTokens,
      });

    return session;
  });

  const cookie = lucia.createSessionCookie(session.id);

  return { session, cookie };
}

export async function invalidateSession(sessionId: LuciaSession["id"]) {
  await lucia.invalidateSession(sessionId);

  const cookie = lucia.createBlankSessionCookie();

  return { cookie };
}

export async function invalidateUserSessions(userId: LuciaUser["id"]) {
  await lucia.invalidateUserSessions(userId);
}
