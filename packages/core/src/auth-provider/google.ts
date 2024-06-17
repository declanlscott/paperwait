import { generateCodeVerifier, generateState, Google } from "arctic";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants";
import { InternalServerError } from "../errors/http";
import { fn } from "../valibot";

import type { IdToken, ProviderTokens } from "./types";

export const google = new Google(
  Resource.GoogleClientId.value,
  Resource.GoogleClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `${Resource.ClientDomain.value}${AUTH_CALLBACK_PATH}`,
);

export async function createGoogleAuthorizationUrl(hostedDomain: string) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authorizationUrl = await google.createAuthorizationURL(
    state,
    codeVerifier,
    {
      scopes: ["profile", "email"],
    },
  );

  authorizationUrl.searchParams.set("hd", hostedDomain);

  return { authorizationUrl, state, codeVerifier };
}

export function parseGoogleIdToken(
  idToken: ProviderTokens["idToken"],
): IdToken {
  const jwt = parseJWT(idToken);

  if (!jwt?.payload) throw new InternalServerError("Empty id token payload");

  return fn(
    v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
    ({ hd, sub, name }) => ({
      orgProviderId: hd,
      userProviderId: sub,
      username: name,
    }),
    {
      Error: InternalServerError,
      message: `Failed to parse google id token payload`,
    },
  )(jwt.payload);
}

export type { GoogleTokens, GoogleRefreshedTokens } from "arctic";
