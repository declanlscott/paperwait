import { MicrosoftEntraId } from "arctic";
import { Lucia } from "lucia";
import { Resource } from "sst";

import { adapter as localAdapter } from "~/lib/db/local";
import { adapter as remoteAdapter } from "~/lib/db/remote";
import { authRedirectPath, domain, localhost } from "~/utils/constants";

const isProd = import.meta.env.PROD;
const adapter = isProd ? remoteAdapter : localAdapter;
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: isProd,
    },
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
  }
}

export const entraId = new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  isProd
    ? `https://${domain}${authRedirectPath}`
    : `http://${localhost}${authRedirectPath}`,
);
