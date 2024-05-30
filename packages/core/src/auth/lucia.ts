import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";

import { db } from "../database";
import { generateId } from "../nano-id";
import { User } from "../user/user.sql";
import { Session } from "./session.sql";

import type { Session as LuciaSession, User as LuciaUser } from "lucia";
import type { NanoId } from "../nano-id";

export const adapter = new DrizzlePostgreSQLAdapter(db, Session, User);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: { secure: (process.env.PROD ?? "false") === "true" },
  },
  getUserAttributes: (attributes) => ({
    providerId: attributes.providerId,
    orgId: attributes.orgId,
    name: attributes.name,
    role: attributes.role,
    email: attributes.email,
    username: attributes.username,
  }),
  getSessionAttributes: ({ orgId }) => ({ orgId }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<User, "id">;
    DatabaseSessionAttributes: {
      orgId: NanoId;
    };
  }
}

export type { User as LuciaUser, Session as LuciaSession } from "lucia";

export async function createSession(
  userId: LuciaUser["id"],
  orgId: LuciaUser["orgId"],
) {
  const session = await lucia.createSession(
    userId,
    { orgId },
    { sessionId: generateId() },
  );

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
