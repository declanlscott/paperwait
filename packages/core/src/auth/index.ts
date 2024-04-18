import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";

import { db } from "../database";
import { Session } from "./session.sql";
import { User } from "./user.sql";

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

export interface LuciaRegister {
  Lucia: typeof lucia;
  DatabaseUserAttributes: Omit<typeof User.$inferSelect, "id">;
}

declare module "lucia" {
  interface Register extends LuciaRegister {}
}
