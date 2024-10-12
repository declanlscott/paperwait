import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { add, isAfter, sub } from "date-fns";
import { and, eq, lte } from "drizzle-orm";

import { SESSION_COOKIE_NAME, SESSION_EXPIRATION_DURATION } from "../constants";
import { useTransaction } from "../drizzle/transaction";
import { tenantsTable } from "../tenants/sql";
import { userProfilesTable, usersTable } from "../users/sql";
import { sessionsTable, sessionTokensTable } from "./sql";

import type { Oauth2Tokens } from "../oauth2/tokens";
import type { Tenant } from "../tenants/sql";
import type { User, UserWithProfile } from "../users/sql";
import type { Session, SessionTokens } from "./sql";

export type Auth =
  | { user: UserWithProfile; session: Session; tenant: Tenant }
  | { user: null; session: null; tenant: null };

export type Authenticated = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true };

export type Unauthenticated = {
  [TKey in keyof Auth]: null;
} & { isAuthed: false };

export type Cookie = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  attributes: {
    secure?: boolean;
    path?: string;
    domain?: string;
    sameSite?: "lax" | "strict" | "none";
    httpOnly?: boolean;
    maxAge?: number;
    expires?: Date;
  };
};

export function generateSessionToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));

  const token = encodeBase32LowerCaseNoPadding(randomBytes);

  return token;
}

const getSessionId = (token: string) =>
  encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

export async function createSession(
  attributes: Omit<Session, "id" | "expiresAt">,
  oauth2Tokens: Oauth2Tokens,
): Promise<{ session: Session; cookie: Cookie }> {
  const token = generateSessionToken();
  const id = getSessionId(token);

  const session = await useTransaction(async (tx) => {
    const session = await tx
      .insert(sessionsTable)
      .values({
        id,
        expiresAt: add(Date.now(), SESSION_EXPIRATION_DURATION),
        ...attributes,
      })
      .returning()
      .then((rows) => rows.at(0));
    if (!session) throw new Error("Failed to create session");

    const sessionTokens = {
      idToken: oauth2Tokens.idToken(),
      accessToken: oauth2Tokens.accessToken(),
      accessTokenExpiresAt: oauth2Tokens.accessTokenExpiresAt(),
      refreshToken: oauth2Tokens.refreshToken(),
    } satisfies Pick<
      SessionTokens,
      "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
    >;

    await tx
      .insert(sessionTokensTable)
      .values({
        sessionId: id,
        userId: attributes.userId,
        tenantId: attributes.tenantId,
        ...sessionTokens,
      })
      .onConflictDoUpdate({
        target: [sessionTokensTable.sessionId],
        set: sessionTokens,
      });

    return session;
  });

  const cookie = createSessionCookie({ token, expiresAt: session.expiresAt });

  return { session, cookie };
}

export async function validateSessionToken(token: string): Promise<Auth> {
  const sessionId = getSessionId(token);

  return useTransaction(async (tx) => {
    const result = await tx
      .select({
        user: usersTable,
        userProfile: userProfilesTable,
        session: sessionsTable,
        tenant: tenantsTable,
      })
      .from(sessionsTable)
      .innerJoin(
        usersTable,
        and(
          eq(sessionsTable.userId, usersTable.id),
          eq(sessionsTable.tenantId, usersTable.tenantId),
        ),
      )
      .innerJoin(
        userProfilesTable,
        and(
          eq(usersTable.id, userProfilesTable.userId),
          eq(usersTable.tenantId, userProfilesTable.tenantId),
        ),
      )
      .innerJoin(tenantsTable, eq(sessionsTable.tenantId, tenantsTable.id))
      .where(eq(sessionsTable.id, sessionId))
      .then((rows) => rows.at(0));
    if (!result) return { user: null, session: null, tenant: null };

    const now = Date.now();

    if (isAfter(now, result.session.expiresAt)) {
      await tx.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));

      return { user: null, session: null, tenant: null };
    }

    if (isAfter(now, sub(result.session.expiresAt, { days: 15 })))
      await tx
        .update(sessionsTable)
        .set({ expiresAt: add(now, SESSION_EXPIRATION_DURATION) })
        .where(eq(sessionsTable.id, sessionId));

    return { ...result, user: { ...result.user, profile: result.userProfile } };
  });
}

export async function invalidateSession(
  sessionId: Session["id"],
): Promise<{ cookie: Cookie }> {
  await useTransaction(async (tx) =>
    tx.delete(sessionsTable).where(eq(sessionsTable.id, sessionId)),
  );

  const cookie = createSessionCookie();

  return { cookie };
}

export function createSessionCookie(props?: {
  token: string;
  expiresAt: Date;
}): Cookie {
  if (!props)
    return {
      name: SESSION_COOKIE_NAME,
      value: "",
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      },
    };

  return {
    name: SESSION_COOKIE_NAME,
    value: props.token,
    attributes: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: props.expiresAt,
    },
  };
}

export const invalidateUserSessions = async (userId: User["id"]) =>
  useTransaction(async (tx) => {
    tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
  });

export const deleteExpiredSessions = async () =>
  useTransaction(async (tx) => {
    tx.delete(sessionsTable).where(lte(sessionsTable.expiresAt, new Date()));
  });
