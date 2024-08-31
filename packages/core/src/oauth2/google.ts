import { generateCodeVerifier, generateState, Google } from "arctic";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants";
import { HttpError, InternalServerError } from "../errors/http";

import type { IdToken, ProviderTokens } from "./tokens";

export const provider = new Google(
  Resource.Auth.google.clientId,
  Resource.Auth.google.clientSecret,
  Resource.Meta.isDev === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `https://${Resource.Meta.domain}${AUTH_CALLBACK_PATH}`,
);

export function createAuthorizationUrl(hostedDomain: string) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authorizationUrl = provider.createAuthorizationURL(
    state,
    codeVerifier,
    ["profile", "email"],
  );

  authorizationUrl.searchParams.set("hd", hostedDomain);

  return { authorizationUrl, state, codeVerifier };
}

export const validateAuthorizationCode = async (
  code: string,
  codeVerifier: string,
) => provider.validateAuthorizationCode(code, codeVerifier);

export async function getUserInfo(accessToken: string) {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
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
      given_name: v.optional(v.string()),
    }),
    await res.json(),
  );
}

export function parseIdToken(idToken: ProviderTokens["idToken"]): IdToken {
  const jwt = parseJWT(idToken);
  if (!jwt?.payload) throw new InternalServerError("Empty id token payload");

  const { hd, sub, name } = v.parse(
    v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
    jwt.payload,
  );

  return {
    providerId: hd,
    userId: sub,
    username: name,
  };
}
