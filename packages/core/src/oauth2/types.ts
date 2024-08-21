import type { SessionTokens } from "../auth/session.sql";
import type { OAuth2Provider } from "./provider.sql";

export type ProviderTokens = Pick<
  SessionTokens,
  "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
>;

export type IdToken = {
  userProviderId: string;
  orgProviderId: string;
  username: string;
};

export type OAuth2ProviderData = {
  variant: OAuth2Provider["variant"];
  id: OAuth2Provider["id"];
  accessToken: ProviderTokens["accessToken"];
};

export type { OAuth2Tokens } from "arctic";
