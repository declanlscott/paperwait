import { generateCodeVerifier, generateState, MicrosoftEntraId } from "arctic";
import { and, eq } from "drizzle-orm";
import { Resource } from "sst";
import * as v from "valibot";

import { useTransaction } from "../drizzle/transaction";
import { useAuthenticated } from "../sessions/context";
import { userProfilesTable, usersTable } from "../users/sql";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";
import { useOauth2 } from "./context";

import type { Oauth2 } from ".";
import type { SessionTokens } from "../sessions/sql";
import type { User } from "../users/sql";

export namespace EntraId {
  export const provider = new MicrosoftEntraId(
    "organizations",
    Resource.Oauth2.entraId.clientId,
    Resource.Oauth2.entraId.clientSecret,
    Resource.AppData.isDev
      ? `http://localhost:4321${Constants.AUTH_CALLBACK_PATH}`
      : `https://${Resource.AppData.domainName.fullyQualified}${Constants.AUTH_CALLBACK_PATH}`,
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
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

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

  export async function parseIdToken(
    idToken: SessionTokens["idToken"],
  ): Promise<Oauth2.IdToken> {
    const payload = await Utils.parseJwt(idToken);
    if (!payload)
      throw new HttpError.InternalServerError("Empty id token payload");

    const { tid, oid, preferred_username } = v.parse(
      v.object({
        tid: v.pipe(v.string(), v.uuid()),
        oid: v.pipe(v.string(), v.uuid()),
        preferred_username: v.string(),
      }),
      payload,
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
    const { tenant } = useAuthenticated();
    const oauth2 = useOauth2();

    const user = await useTransaction((tx) =>
      tx
        .select({ id: userProfilesTable.oauth2UserId })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)),
        )
        .then((rows) => rows.at(0)),
    );
    if (!user) throw new HttpError.NotFound("User not found");

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${user.id}/photo/$value`,
      {
        headers: {
          Authorization: `Bearer ${oauth2.provider.accessToken}`,
        },
      },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return res;
  }
}
