import { SessionTokens } from "@paperwait/core/auth";
import { entraId, google } from "@paperwait/core/auth-provider";
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
import { Organization } from "@paperwait/core/organization";
import { MaxFileSizes } from "@paperwait/core/schemas";
import { enforceRbac } from "@paperwait/core/utils";
import { validate } from "@paperwait/core/valibot";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import type { LuciaSession } from "@paperwait/core/auth";
import type {
  GoogleRefreshedTokens,
  MicrosoftEntraIdTokens,
  ProviderData,
  ProviderTokens,
} from "@paperwait/core/auth-provider";
import type { Provider } from "@paperwait/core/organization";
import type { UserRole } from "@paperwait/core/user";
import type { HonoEnv } from "~/api/types";

export const authorization = (
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    const { session, user } = c.env.locals;
    if (!session || !user) throw new UnauthorizedError();

    enforceRbac(user, roles, ForbiddenError);

    await next();
  });

export const provider = createMiddleware<HonoEnv>(async (c, next) => {
  const session = c.env.locals.session;
  if (!session) throw new UnauthorizedError("Session not found");

  c.set("provider", await validateProvider(session.id));

  await next();
});

async function validateProvider(
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
  const expired = Date.now() > tokens.accessTokenExpiresAt.getTime() - 10_000;

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

async function refreshAccessToken(provider: {
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

export const maxContentLength = (
  variant: keyof MaxFileSizes,
  contentLength: number,
) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    const orgId = c.env.locals.org!.id;

    const maxFileSizes = validate(
      MaxFileSizes,
      await getSsmParameter({
        Name: buildSsmParameterPath(orgId, MAX_FILE_SIZES_PARAMETER_NAME),
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
