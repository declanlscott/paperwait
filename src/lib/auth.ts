import { MicrosoftEntraId } from "arctic";
import { Lucia } from "lucia";
import { Resource } from "sst";

import { authAdapter } from "~/lib/db";
import { authRedirectPath, domain, localhost } from "~/utils/constants";
import { isDevEnv } from "~/utils/env";

import type { User } from "~/lib/db/schema";

export const lucia = new Lucia(authAdapter, {
  sessionCookie: { attributes: { secure: import.meta.env.PROD } },
  getUserAttributes: ({ providerId, orgId, name }) => ({
    providerId,
    orgId,
    name,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: Omit<typeof User.$inferSelect, "id">;
  }
}

export const entraId = new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  isDevEnv
    ? `http://${localhost}${authRedirectPath}`
    : `https://${domain}${authRedirectPath}`,
);
