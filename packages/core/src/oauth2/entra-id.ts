import { generateCodeVerifier, generateState, MicrosoftEntraId } from "arctic";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants";
import { HttpError, InternalServerError } from "../errors/http";

import type { IdToken, ProviderTokens } from "./tokens";

export const provider = new MicrosoftEntraId(
  "organizations",
  Resource.Auth.entraId.clientId,
  Resource.Auth.entraId.clientSecret,
  Resource.Meta.isDev === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `https://${Resource.Meta.domain}${AUTH_CALLBACK_PATH}`,
);

export function createAuthorizationUrl() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authorizationUrl = provider.createAuthorizationURL(
    state,
    codeVerifier,
    ["profile", "email", "offline_access", "User.Read", "User.ReadBasic.All"],
  );

  return { authorizationUrl, state, codeVerifier };
}

export const validateAuthorizationCode = async (
  code: string,
  codeVerifier: string,
) => provider.validateAuthorizationCode(code, codeVerifier);

export async function getUserInfo(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/oidc/userinfo", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new HttpError(res.statusText, res.status);

  return v.parse(
    v.looseObject({
      sub: v.string(),
      name: v.string(),
      picture: v.string(),
      email: v.string(),
      family_name: v.optional(v.string()),
      given_name: v.optional(v.string()),
    }),
    await res.json(),
  );
}

export function parseIdToken(idToken: ProviderTokens["idToken"]): IdToken {
  const jwt = parseJWT(idToken);
  if (!jwt?.payload) throw new InternalServerError("Empty id token payload");

  const { tid, oid, preferred_username } = v.parse(
    v.object({
      tid: v.pipe(v.string(), v.uuid()),
      oid: v.pipe(v.string(), v.uuid()),
      preferred_username: v.string(),
    }),
    jwt.payload,
  );

  return {
    providerId: tid,
    userId: oid,
    username: preferred_username,
  };
}
