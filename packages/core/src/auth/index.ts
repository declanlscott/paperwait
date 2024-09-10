import { Lucia } from "lucia";
import { Resource } from "sst";

import { AUTH_SESSION_COOKIE_NAME } from "../constants";
import { useTransaction } from "../drizzle/transaction";
import { generateId } from "../utils/helpers";
import { DbAdapter } from "./adapter";
import { sessionTokensTable } from "./sql";

import type {
  Session as LuciaSession,
  User as LuciaUser,
  RegisteredDatabaseSessionAttributes,
} from "lucia";
import type { Oauth2Tokens } from "../oauth2/tokens";
import type { Organization } from "../organizations/sql";
import type { User } from "../users/sql";
import type { Session, SessionTokens } from "./sql";

export type Auth = {
  session: LuciaSession | null;
  user: LuciaUser["data"] | null;
  org: LuciaUser["org"] | null;
};

export type Authenticated = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true };

export interface Unauthenticated extends Record<keyof Auth, null> {
  isAuthed: false;
}

export const lucia = new Lucia(new DbAdapter(), {
  sessionCookie: {
    attributes: { secure: Resource.Meta.app.stage === "production" },
    name: AUTH_SESSION_COOKIE_NAME,
  },
  getUserAttributes: ({ user, org }) => ({
    data: {
      id: user.id,
      oauth2UserId: user.oauth2UserId,
      orgId: user.orgId,
      name: user.name,
      role: user.role,
      email: user.email,
      username: user.username,
    },
    org: {
      id: org.id,
      slug: org.slug,
      status: org.status,
    },
  }),
  getSessionAttributes: (attributes) => ({
    orgId: attributes.orgId,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: { user: User; org: Organization };
    DatabaseSessionAttributes: Pick<Session, "orgId">;
  }
}

export function createSessionCookie(sessionId?: LuciaSession["id"]) {
  if (!sessionId) return lucia.createBlankSessionCookie();

  return lucia.createSessionCookie(sessionId);
}

export async function createSession(
  userId: LuciaUser["id"],
  attributes: RegisteredDatabaseSessionAttributes,
  tokens: Oauth2Tokens,
) {
  const session = await useTransaction(async (tx) => {
    const session = await lucia.createSession(userId, attributes, {
      sessionId: generateId(),
    });

    const sessionTokens = {
      idToken: tokens.idToken(),
      accessToken: tokens.accessToken(),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt(),
      refreshToken: tokens.refreshToken(),
    } satisfies Pick<
      SessionTokens,
      "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
    >;

    await tx
      .insert(sessionTokensTable)
      .values({
        sessionId: session.id,
        userId,
        orgId: attributes.orgId,
        ...sessionTokens,
      })
      .onConflictDoUpdate({
        target: [sessionTokensTable.sessionId],
        set: sessionTokens,
      });

    return session;
  });

  const cookie = createSessionCookie(session.id);

  return { session, cookie };
}

export const validateSession = async (sessionId: LuciaSession["id"]) =>
  lucia.validateSession(sessionId);

export async function invalidateSession(sessionId: LuciaSession["id"]) {
  await lucia.invalidateSession(sessionId);

  const cookie = createSessionCookie();

  return { cookie };
}

export async function invalidateUserSessions(userId: LuciaUser["id"]) {
  await lucia.invalidateUserSessions(userId);
}

export const deleteExpiredSessions = async () => lucia.deleteExpiredSessions();
