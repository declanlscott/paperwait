import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { add, isAfter, sub } from "date-fns";
import { and, eq, lte } from "drizzle-orm";

import { Constants } from "../constants";
import { useTransaction } from "../drizzle/transaction";
import { tenantsTable } from "../tenants/sql";
import { userProfilesTable, usersTable } from "../users/sql";
import { sessionsTable, sessionTokensTable } from "./sql";

import type { Oauth2 } from "../oauth2";
import type { User } from "../users/sql";
import type { Auth } from "./shared";
import type { Session, SessionTokens } from "./sql";

export namespace Sessions {
  export type Cookie = {
    name: typeof Constants.SESSION_COOKIE_NAME;
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

  export function generateToken(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(20));

    const token = encodeBase32LowerCaseNoPadding(randomBytes);

    return token;
  }

  const getId = (token: string) =>
    encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  export async function create(
    attributes: Omit<Session, "id" | "expiresAt">,
    oauth2Tokens: Oauth2.Tokens,
  ): Promise<{ session: Session; cookie: Cookie }> {
    const token = generateToken();
    const id = getId(token);

    const session = await useTransaction(async (tx) => {
      const session = await tx
        .insert(sessionsTable)
        .values({
          id,
          expiresAt: add(Date.now(), Constants.SESSION_LIFETIME),
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

    const cookie = createCookie({ token, expiresAt: session.expiresAt });

    return { session, cookie };
  }

  export async function validateToken(token: string): Promise<Auth> {
    const sessionId = getId(token);

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
      if (!result)
        return {
          user: null,
          session: null,
          tenant: null,
          isAuthed: false,
        } as const;

      const now = Date.now();

      if (isAfter(now, result.session.expiresAt)) {
        await tx.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));

        return {
          user: null,
          session: null,
          tenant: null,
          isAuthed: false,
        } as const;
      }

      if (isAfter(now, sub(result.session.expiresAt, { days: 15 })))
        await tx
          .update(sessionsTable)
          .set({ expiresAt: add(now, Constants.SESSION_LIFETIME) })
          .where(eq(sessionsTable.id, sessionId));

      return {
        user: { ...result.user, profile: result.userProfile },
        session: result.session,
        tenant: result.tenant,
        isAuthed: true,
      } as const;
    });
  }

  export async function invalidate(
    sessionId: Session["id"],
  ): Promise<{ cookie: Cookie }> {
    await useTransaction(async (tx) =>
      tx.delete(sessionsTable).where(eq(sessionsTable.id, sessionId)),
    );

    const cookie = createCookie();

    return { cookie };
  }

  export function createCookie(props?: {
    token: string;
    expiresAt: Date;
  }): Cookie {
    if (!props)
      return {
        name: Constants.SESSION_COOKIE_NAME,
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
      name: Constants.SESSION_COOKIE_NAME,
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

  export const invalidateUser = async (userId: User["id"]) =>
    useTransaction(async (tx) => {
      tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    });

  export const deleteExpired = async () =>
    useTransaction(async (tx) => {
      tx.delete(sessionsTable).where(lte(sessionsTable.expiresAt, new Date()));
    });
}
