import {
  generateCodeVerifier,
  generateState,
  Google,
  MicrosoftEntraId,
} from "arctic";
import { eq } from "drizzle-orm";
import { parseJWT } from "oslo/jwt";
import { Resource } from "sst";
import * as v from "valibot";

import { AUTH_CALLBACK_PATH } from "../constants";
import { db } from "../database";
import {
  InternalServerError,
  NotImplementedError,
  UnauthorizedError,
} from "../errors/http";
import { Organization } from "../organization/organization.sql";
import { fn } from "../valibot";
import { SessionTokens } from "./session.sql";

import type { GoogleRefreshedTokens, MicrosoftEntraIdTokens } from "arctic";
import type { Provider } from "../organization/organization.sql";
import type { LuciaSession } from "./lucia";

export const entraId = new MicrosoftEntraId(
  "organizations",
  Resource.EntraIdApplication.clientId,
  Resource.EntraIdClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `${Resource.ClientDomain.value}${AUTH_CALLBACK_PATH}`,
);

export const google = new Google(
  Resource.GoogleClientId.value,
  Resource.GoogleClientSecret.value,
  Resource.ClientIsDev.value === "true"
    ? `http://localhost:4321${AUTH_CALLBACK_PATH}`
    : `${Resource.ClientDomain.value}${AUTH_CALLBACK_PATH}`,
);

export async function createProviderAuthorizationUrl(
  org: Pick<Organization, "id" | "provider" | "providerId">,
) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  let authorizationUrl: URL;
  switch (org.provider) {
    case "entra-id": {
      authorizationUrl = await entraId.createAuthorizationURL(
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
      break;
    }
    case "google": {
      authorizationUrl = await google.createAuthorizationURL(
        state,
        codeVerifier,
        {
          scopes: ["profile", "email"],
        },
      );

      authorizationUrl.searchParams.set("hd", org.providerId);
      break;
    }
    default:
      org.provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${org.provider}" is not implemented`,
      );
  }

  return { authorizationUrl, state, codeVerifier };
}

export type ProviderTokens = Pick<
  SessionTokens,
  "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
>;

export async function getProviderTokens(
  provider: Provider,
  code: string,
  codeVerifier: string,
): Promise<ProviderTokens> {
  switch (provider) {
    case "entra-id":
      return await entraId.validateAuthorizationCode(code, codeVerifier);
    case "google":
      return await google.validateAuthorizationCode(code, codeVerifier);
    default:
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
  }
}

export type IdToken = {
  userProviderId: string;
  orgProviderId: string;
  username: string;
};

export function parseProviderIdToken(
  provider: Provider,
  idToken: ProviderTokens["idToken"],
): IdToken {
  const payload = parseJWT(idToken);

  switch (provider) {
    case "entra-id": {
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
          message: `Failed to parse ${provider} id token payload`,
        },
      )(payload);
    }
    case "google": {
      return fn(
        v.object({ hd: v.string(), sub: v.string(), name: v.string() }),
        ({ hd, sub, name }) => ({
          orgProviderId: hd,
          userProviderId: sub,
          username: name,
        }),
        {
          Error: InternalServerError,
          message: `Failed to parse ${provider} id token payload`,
        },
      )(payload);
    }
    default: {
      provider satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider}" is not implemented`,
      );
    }
  }
}

export type ProviderData = {
  type: Provider;
  id: Organization["providerId"];
  accessToken: ProviderTokens["accessToken"];
};

export async function validateProvider(
  sessionId: LuciaSession["id"],
): Promise<ProviderData> {
  const { type, id, ...tokens } = await db
    .select({
      type: Organization.provider,
      id: Organization.providerId,
      idToken: SessionTokens.idToken,
      accessToken: SessionTokens.accessToken,
      accessTokenExpiresAt: SessionTokens.accessTokenExpiresAt,
      refreshToken: SessionTokens.refreshToken,
    })
    .from(SessionTokens)
    .innerJoin(Organization, eq(SessionTokens.orgId, Organization.id))
    .where(eq(SessionTokens.sessionId, sessionId))
    .execute()
    .then((rows) => {
      const result = rows.at(0);

      if (!result) throw new UnauthorizedError("Provider tokens not found");

      return result;
    });

  // Check if the access token is expired within 10 seconds
  const expired =
    Date.now() > tokens.accessTokenExpiresAt.getUTCMilliseconds() - 10_000;

  // Return the access token if it isn't expired
  if (!expired) return { type, id, accessToken: tokens.accessToken };

  // Check if there is a refresh token
  if (!tokens.refreshToken)
    throw new UnauthorizedError("Access token expired, no refresh token");

  // Refresh the access token
  const refreshed = await refreshAccessToken({
    type,
    id,
    refreshToken: tokens.refreshToken,
  });

  // Update the session with the refreshed access token
  await db
    .update(SessionTokens)
    .set(refreshed)
    .where(eq(SessionTokens.sessionId, sessionId));

  return { type, id, accessToken: refreshed.accessToken };
}

export async function refreshAccessToken(provider: {
  type: Provider;
  id: Organization["providerId"];
  refreshToken: NonNullable<ProviderTokens["refreshToken"]>;
}): Promise<MicrosoftEntraIdTokens | GoogleRefreshedTokens> {
  switch (provider.type) {
    case "entra-id":
      return await entraId.refreshAccessToken(provider.refreshToken);
    case "google":
      return await google.refreshAccessToken(provider.refreshToken);
    default:
      provider.type satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider.type}" not implemented`,
      );
  }
}
