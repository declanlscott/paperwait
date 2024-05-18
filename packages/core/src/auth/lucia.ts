import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";

import { db } from "../database";
import { User } from "../user";
import { generateId } from "../utils";
import { Session } from "./session.sql";

import type { Session as LuciaSession, User as LuciaUser } from "lucia";

export const adapter = new DrizzlePostgreSQLAdapter(db, Session, User);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: { secure: (process.env.PROD ?? "false") === "true" },
  },
  getUserAttributes: ({ providerId, orgId, name, role, email }) => ({
    providerId,
    orgId,
    name,
    role,
    email,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<User, "id">;
  }
}

export type { User as LuciaUser, Session as LuciaSession } from "lucia";

export async function createSession(userId: LuciaUser["id"]) {
  const session = await lucia.createSession(
    userId,
    {},
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
