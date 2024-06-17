import type { SessionTokens } from "../auth/session.sql";
import type { Organization, Provider } from "../organization/organization.sql";

export type ProviderTokens = Pick<
  SessionTokens,
  "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
>;

export type IdToken = {
  userProviderId: string;
  orgProviderId: string;
  username: string;
};

export type ProviderData = {
  type: Provider;
  id: Organization["providerId"];
  accessToken: ProviderTokens["accessToken"];
};
