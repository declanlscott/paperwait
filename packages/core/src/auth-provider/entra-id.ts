import { generateCodeVerifier, generateState, MicrosoftEntraId } from "arctic";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants";
import { InternalServerError } from "../errors/http";
import { fn } from "../valibot";

import type { IdToken, ProviderTokens } from "./types";

export const entraId = new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `${Resource.ClientDomain.value}${AUTH_CALLBACK_PATH}`,
);

export async function createEntraIdAuthorizationUrl() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const authorizationUrl = await entraId.createAuthorizationURL(
    state,
    codeVerifier,
    {
      scopes: [
        "profile",
        "email",
        "offline_access",
        "User.Read",
        "User.ReadBasic.All",
      ],
    },
  );

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

export type { MicrosoftEntraIdTokens } from "arctic";
