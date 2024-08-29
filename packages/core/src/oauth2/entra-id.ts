import { generateCodeVerifier, generateState, MicrosoftEntraId } from "arctic";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants";
import { InternalServerError } from "../errors/http";
import { fn } from "../utils/helpers";

import type { IdToken, ProviderTokens } from "./tokens";

export const entraId = new MicrosoftEntraId(
  "organizations",
  Resource.Auth.entraId.clientId,
  Resource.Auth.entraId.clientSecret,
  Resource.Meta.isDev === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `https://${Resource.Meta.domain}${AUTH_CALLBACK_PATH}`,
);

export function createEntraIdAuthorizationUrl() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authorizationUrl = entraId.createAuthorizationURL(state, codeVerifier, [
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "User.ReadBasic.All",
  ]);

  return { authorizationUrl, state, codeVerifier };
}

export function parseEntraIdIdToken(
  idToken: ProviderTokens["idToken"],
): IdToken {
  const jwt = parseJWT(idToken);

  if (!jwt?.payload) throw new InternalServerError("Empty id token payload");

  return fn(
    v.object({
      tid: v.pipe(v.string(), v.uuid()),
      oid: v.pipe(v.string(), v.uuid()),
      preferred_username: v.string(),
    }),
    ({ tid, oid, preferred_username }) => ({
      orgProviderId: tid,
      userProviderId: oid,
      username: preferred_username,
    }),
    {
      Error: InternalServerError,
      message: `Failed to parse entra-id id token payload`,
    },
  )(jwt.payload);
}
