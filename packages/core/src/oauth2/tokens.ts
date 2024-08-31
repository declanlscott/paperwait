import type { SessionsTokens } from "../auth/sql";

export type ProviderTokens = Pick<
  SessionsTokens,
  "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
>;

export type IdToken = {
  providerId: string;
  userId: string;
  username: string;
};

export type { OAuth2Tokens } from "arctic";
