import { Lucia } from "lucia";

import { authAdapter } from "~/lib/server/db";

import type { User } from "~/lib/server/db/schema";

export const lucia = new Lucia(authAdapter, {
  sessionCookie: {
    attributes: {
      secure: import.meta.env?.PROD ?? process.env.PROD === "true",
    },
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
    DatabaseUserAttributes: Omit<typeof User.$inferSelect, "id">;
  }
}
