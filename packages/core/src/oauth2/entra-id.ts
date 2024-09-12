import { generateCodeVerifier, generateState, MicrosoftEntraId } from "arctic";
import { and, eq } from "drizzle-orm";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { useAuthenticated } from "../auth/context";
import { AUTH_CALLBACK_PATH } from "../constants";
import { useTransaction } from "../drizzle/transaction";
import { HttpError, InternalServerError, NotFound } from "../errors/http";
import { usersTable } from "../users/sql";
import { useOauth2 } from "./context";

import type { SessionTokens } from "../auth/sql";
import type { User } from "../users/sql";
import type { IdToken } from "./tokens";

export const provider = new MicrosoftEntraId(
  "organizations",
  Resource.Oauth2.entraId.clientId,
  Resource.Oauth2.entraId.clientSecret,
  Resource.Meta.isDev
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

export function parseIdToken(idToken: SessionTokens["idToken"]): IdToken {
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

export const refreshAccessToken = async (
  refreshToken: NonNullable<SessionTokens["refreshToken"]>,
) => provider.refreshAccessToken(refreshToken);

export async function photo(userId: User["id"]): Promise<Response> {
  const { org } = useAuthenticated();
  const oauth2 = useOauth2();

  const user = await useTransaction((tx) =>
    tx
      .select({ id: usersTable.oauth2UserId })
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), eq(usersTable.orgId, org.id)))
      .then((rows) => rows.at(0)),
  );
  if (!user) throw new NotFound("User not found");

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${user.id}/photo/$value`,
    {
      headers: {
        Authorization: `Bearer ${oauth2.provider.accessToken}`,
      },
    },
  );
  if (!res.ok) throw new HttpError(res.statusText, res.status);

  return res;
}
