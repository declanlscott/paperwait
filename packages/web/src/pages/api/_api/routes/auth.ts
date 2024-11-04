import { vValidator } from "@hono/valibot-validator";
import {
  afterTransaction,
  useTransaction,
  withTransaction,
} from "@paperwait/core/drizzle/transaction";
import { Oauth2 } from "@paperwait/core/oauth2";
import { EntraId } from "@paperwait/core/oauth2/entra-id";
import { Google } from "@paperwait/core/oauth2/google";
import {
  ENTRA_ID,
  GOOGLE,
  oauth2ProviderVariants,
} from "@paperwait/core/oauth2/shared";
import { oauth2ProvidersTable } from "@paperwait/core/oauth2/sql";
import { Realtime } from "@paperwait/core/realtime";
import { Replicache } from "@paperwait/core/replicache";
import { Sessions } from "@paperwait/core/sessions";
import { useAuthenticated } from "@paperwait/core/sessions/context";
import { tenantsTable } from "@paperwait/core/tenants/sql";
import { Users } from "@paperwait/core/users";
import { userProfilesTable, usersTable } from "@paperwait/core/users/sql";
import { HttpError } from "@paperwait/core/utils/errors";
import { nanoIdSchema } from "@paperwait/core/utils/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { authorization } from "~/api/middleware";

import type { UserInfo } from "@paperwait/core/oauth2/shared";

export default new Hono()
  // Login
  .get(
    "/login",
    vValidator(
      "query",
      v.object({ tenant: v.string(), redirect: v.optional(v.string()) }),
    ),
    async (c) => {
      const { tenant: tenantParam, redirect } = c.req.valid("query");

      const tenant = await useTransaction((tx) =>
        tx
          .select({
            id: tenantsTable.id,
            oauth2ProviderId: oauth2ProvidersTable.id,
            oauth2ProviderVariant: oauth2ProvidersTable.variant,
          })
          .from(tenantsTable)
          .where(
            or(
              eq(
                sql`TRIM(LOWER(${tenantsTable.name}))`,
                sql`TRIM(LOWER(${tenantParam}))`,
              ),
              eq(
                sql`TRIM(LOWER(${tenantsTable.slug}))`,
                sql`TRIM(LOWER(${tenantParam}))`,
              ),
            ),
          )
          .innerJoin(
            oauth2ProvidersTable,
            and(
              eq(tenantsTable.oauth2ProviderId, oauth2ProvidersTable.id),
              eq(tenantsTable.id, oauth2ProvidersTable.tenantId),
            ),
          )
          .then((rows) => rows.at(0)),
      );
      if (!tenant) throw new HttpError.NotFound("Tenant not found");

      let state: string;
      let codeVerifier: string;
      let authorizationUrl: URL;
      switch (tenant.oauth2ProviderVariant) {
        case ENTRA_ID: {
          const entraId = EntraId.createAuthorizationUrl();
          state = entraId.state;
          codeVerifier = entraId.codeVerifier;
          authorizationUrl = entraId.authorizationUrl;
          break;
        }
        case GOOGLE: {
          const google = Google.createAuthorizationUrl(tenant.oauth2ProviderId);
          state = google.state;
          codeVerifier = google.codeVerifier;
          authorizationUrl = google.authorizationUrl;
          break;
        }
        default: {
          tenant.oauth2ProviderVariant satisfies never;

          throw new HttpError.NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${tenant.oauth2ProviderVariant}" not implemented`,
          );
        }
      }

      for (const [name, value] of [
        ["provider", tenant.oauth2ProviderVariant],
        ["state", state],
        ["code_verifier", codeVerifier],
        ["tenantId", tenant.id],
        ["redirect", redirect],
      ] as const)
        if (value)
          setCookie(c, name, value, {
            path: "/",
            secure: Resource.AppData.stage === "production",
            httpOnly: true,
            maxAge: 60 * 10, // 10 minutes
            sameSite: "lax",
          });

      return c.redirect(authorizationUrl.toString());
    },
  )
  // Callback
  .get(
    "/callback",
    vValidator("query", v.object({ code: v.string(), state: v.string() })),
    vValidator(
      "cookie",
      v.object({
        provider: v.picklist(oauth2ProviderVariants),
        state: v.string(),
        code_verifier: v.string(),
        tenantId: v.string(),
        redirect: v.fallback(v.string(), "/dashboard"),
      }),
    ),
    async (c) => {
      const { code } = c.req.valid("query");
      const { provider, code_verifier, tenantId, redirect } =
        c.req.valid("cookie");

      let tokens: Oauth2.Tokens;
      let idToken: Oauth2.IdToken;
      switch (provider) {
        case ENTRA_ID: {
          tokens = await EntraId.validateAuthorizationCode(
            code,
            code_verifier,
          ).catch(rethrowHttpError);
          idToken = await EntraId.parseIdToken(tokens.idToken());
          break;
        }
        case GOOGLE: {
          tokens = await Google.validateAuthorizationCode(
            code,
            code_verifier,
          ).catch(rethrowHttpError);
          idToken = await Google.parseIdToken(tokens.idToken());
          break;
        }
        default: {
          provider satisfies never;

          throw new HttpError.NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${provider}" not implemented`,
          );
        }
      }

      const result = await useTransaction((tx) =>
        tx
          .select({
            tenant: tenantsTable,
            user: usersTable,
            userProfile: userProfilesTable,
          })
          .from(tenantsTable)
          .leftJoin(usersTable, eq(usersTable.tenantId, tenantsTable.id))
          .leftJoin(
            userProfilesTable,
            eq(userProfilesTable.userId, usersTable.id),
          )
          .where(
            and(
              eq(tenantsTable.id, tenantId),
              eq(usersTable.username, idToken.username),
              eq(usersTable.tenantId, tenantId),
              eq(userProfilesTable.tenantId, tenantId),
            ),
          )
          .then((rows) => rows.at(0)),
      );
      if (!result?.tenant) throw new HttpError.NotFound("Tenant not found");
      if (result.tenant.status === "suspended")
        throw new HttpError.Unauthorized("Tenant is suspended");
      if (!result.user) throw new HttpError.NotFound("User not found");
      if (result.user.deletedAt)
        throw new HttpError.Unauthorized("User is deleted");

      let userInfo: UserInfo;
      switch (provider) {
        case ENTRA_ID: {
          userInfo = await EntraId.getUserInfo(tokens.accessToken());
          break;
        }
        case GOOGLE: {
          userInfo = await Google.getUserInfo(tokens.accessToken());
          break;
        }
        default: {
          provider satisfies never;

          throw new HttpError.NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${provider}" not implemented`,
          );
        }
      }

      const user = {
        ...result.user,
        profile: result.userProfile,
      };
      const { cookie } = await withTransaction(async (tx) => {
        if (!user.profile) {
          const newUserProfile = await Users.createProfile({
            userId: user.id,
            oauth2UserId: idToken.userId,
            name: userInfo.name,
            email: userInfo.email,
            tenantId,
          });
          if (!newUserProfile) throw new Error("Failed to create user profile");

          await afterTransaction(() =>
            Replicache.poke([Realtime.formatChannel("tenant", tenantId)]),
          );

          return Sessions.create({ userId: user.id, tenantId }, tokens);
        }

        const existingUserInfo = {
          name: user.profile.name,
          email: user.profile.email,
          username: user.username,
        };

        const freshUserInfo = {
          name: userInfo.name,
          email: userInfo.email,
          username: idToken.username,
        };

        if (!R.isDeepEqual(existingUserInfo, freshUserInfo)) {
          if (user.profile.name !== idToken.username)
            await tx
              .update(usersTable)
              .set({ username: idToken.username })
              .where(
                and(
                  eq(usersTable.id, user.id),
                  eq(usersTable.tenantId, tenantId),
                ),
              );

          if (
            existingUserInfo.name !== freshUserInfo.name ||
            existingUserInfo.email !== freshUserInfo.email
          ) {
            await tx
              .update(userProfilesTable)
              .set({ name: freshUserInfo.name, email: freshUserInfo.email })
              .where(
                and(
                  eq(userProfilesTable.userId, user.id),
                  eq(userProfilesTable.tenantId, tenantId),
                ),
              );
          }

          await afterTransaction(() =>
            Replicache.poke([Realtime.formatChannel("tenant", tenantId)]),
          );
        }

        return Sessions.create({ userId: user.id, tenantId }, tokens);
      });

      setCookie(c, cookie.name, cookie.value, cookie.attributes);

      return c.redirect(redirect);
    },
  )
  // Logout
  .post("/logout", authorization(), async (c) => {
    const { session } = useAuthenticated();

    const { cookie } = await Sessions.invalidate(session.id);

    setCookie(c, cookie.name, cookie.value, cookie.attributes);

    return c.body(null, 204);
  })
  // Logout user
  .post(
    "/logout/:userId",
    authorization(["administrator"]),
    vValidator("param", v.object({ userId: nanoIdSchema })),
    async (c) => {
      const { userId } = c.req.valid("param");

      const userExists = await Users.exists(userId);
      if (!userExists)
        throw new HttpError.NotFound(`User "${userId}" not found`);

      await Sessions.invalidateUser(userId);

      return c.body(null, 204);
    },
  );

function rethrowHttpError(error: Error): never {
  console.error(error);

  if (error instanceof Oauth2.RequestError)
    throw new HttpError.BadRequest(error.message);
  if (error instanceof Oauth2.FetchError)
    throw new HttpError.InternalServerError(error.message);
  if (error instanceof Error)
    throw new HttpError.InternalServerError(error.message);

  throw new HttpError.InternalServerError("An unexpected error occurred");
}
