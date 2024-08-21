import { SessionTokens, useAuth } from "@paperwait/core/auth";
import { buildSsmParameterPath, getSsmParameter } from "@paperwait/core/aws";
import { MAX_FILE_SIZES_PARAMETER_NAME } from "@paperwait/core/constants";
import { db } from "@paperwait/core/database";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotImplementedError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import {
  entraId,
  google,
  OAuth2Provider,
  withOAuth2,
} from "@paperwait/core/oauth2";
import { MaxFileSizes } from "@paperwait/core/schemas";
import { enforceRbac } from "@paperwait/core/utils";
import { validate } from "@paperwait/core/valibot";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { useAuthenticated } from "~/app/lib/hooks/auth";

import type { LuciaSession } from "@paperwait/core/auth";
import type {
  OAuth2ProviderData,
  OAuth2Tokens,
  ProviderTokens,
} from "@paperwait/core/oauth2";
import type { UserRole } from "@paperwait/core/user";

export const authorization = (
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  createMiddleware(async (_, next) => {
    const { session, user } = useAuth();
    if (!session || !user) throw new UnauthorizedError();

    enforceRbac(user, roles, ForbiddenError);

    await next();
  });

export const provider = createMiddleware(async (c, next) => {
  const { session } = useAuth();
  if (!session) throw new UnauthorizedError("Session not found");

  await withOAuth2(
    { provider: await validateOAuth2Provider(session.id) },
    next,
  );
});

async function validateOAuth2Provider(
  sessionId: LuciaSession["id"],
): Promise<OAuth2ProviderData> {
  const { variant, id, ...tokens } = await db
    .select({
      variant: OAuth2Provider.variant,
      id: OAuth2Provider.id,
      idToken: SessionTokens.idToken,
      accessToken: SessionTokens.accessToken,
      accessTokenExpiresAt: SessionTokens.accessTokenExpiresAt,
      refreshToken: SessionTokens.refreshToken,
    })
    .from(SessionTokens)
    .innerJoin(OAuth2Provider, eq(SessionTokens.orgId, OAuth2Provider.orgId))
    .where(eq(SessionTokens.sessionId, sessionId))
    .execute()
    .then((rows) => {
      const result = rows.at(0);

      if (!result) throw new UnauthorizedError("Provider tokens not found");

      return result;
    });

  // Check if the access token is expired within 10 seconds
  const expired = Date.now() > tokens.accessTokenExpiresAt.getTime() - 10_000;

  // Return the access token if it isn't expired
  if (!expired) return { variant, id, accessToken: tokens.accessToken };

  // Check if there is a refresh token
  if (!tokens.refreshToken)
    throw new UnauthorizedError("Access token expired, no refresh token");

  // Refresh the access token
  const refreshed = await refreshAccessToken({
    variant,
    id,
    refreshToken: tokens.refreshToken,
  });

  const sessionTokens = {
    idToken: refreshed.idToken(),
    accessToken: refreshed.accessToken(),
    accessTokenExpiresAt: refreshed.accessTokenExpiresAt(),
    refreshToken: refreshed.refreshToken(),
  } satisfies Pick<
    SessionTokens,
    "idToken" | "accessToken" | "accessTokenExpiresAt" | "refreshToken"
  >;

  // Update the session with the refreshed access token
  await db
    .update(SessionTokens)
    .set(sessionTokens)
    .where(eq(SessionTokens.sessionId, sessionId));

  return { variant, id, accessToken: sessionTokens.accessToken };
}

async function refreshAccessToken(provider: {
  variant: OAuth2Provider["variant"];
  id: OAuth2Provider["id"];
  refreshToken: NonNullable<ProviderTokens["refreshToken"]>;
}): Promise<OAuth2Tokens> {
  switch (provider.variant) {
    case "entra-id":
      return await entraId.refreshAccessToken(provider.refreshToken);
    case "google":
      return await google.refreshAccessToken(provider.refreshToken);
    default:
      provider.variant satisfies never;

      throw new NotImplementedError(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Provider "${provider.variant}" not implemented`,
      );
  }
}

export const maxContentLength = (
  variant: keyof MaxFileSizes,
  contentLength: number,
) =>
  createMiddleware(async (c, next) => {
    const { org } = useAuthenticated();

    const maxFileSizes = validate(
      MaxFileSizes,
      await getSsmParameter({
        Name: buildSsmParameterPath(org.id, MAX_FILE_SIZES_PARAMETER_NAME),
      }),
      {
        Error: InternalServerError,
        message: "Failed to parse max file sizes",
      },
    );

    validate(
      v.pipe(v.number(), v.minValue(0), v.maxValue(maxFileSizes[variant])),
      contentLength,
      {
        Error: BadRequestError,
        message: "Content length exceeds maximum file size",
      },
    );

    await next();
  });
