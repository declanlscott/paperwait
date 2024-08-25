import { generateCodeVerifier, generateState, Google } from "arctic";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants/misc";
import { InternalServerError } from "../errors/http";
import { fn } from "../utils/fn";

import type { IdToken, ProviderTokens } from "./tokens";

export const google = new Google(
  Resource.Auth.google.clientId,
  Resource.Auth.google.clientSecret,
  Resource.Meta.isDev === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `https://${Resource.Meta.domain}${AUTH_CALLBACK_PATH}`,
);

export function createGoogleAuthorizationUrl(hostedDomain: string) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authorizationUrl = google.createAuthorizationURL(state, codeVerifier, [
    "profile",
    "email",
  ]);

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
