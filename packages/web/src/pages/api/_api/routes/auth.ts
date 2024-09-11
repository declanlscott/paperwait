import { vValidator } from "@hono/valibot-validator";
import * as Auth from "@paperwait/core/auth";
import { useAuthenticated } from "@paperwait/core/auth/context";
import { and, db, eq, or, sql } from "@paperwait/core/drizzle";
import {
  afterTransaction,
  withTransaction,
} from "@paperwait/core/drizzle/transaction";
import {
  BadRequest,
  InternalServerError,
  NotFound,
  NotImplemented,
  Unauthorized,
} from "@paperwait/core/errors/http";
import {
  ArcticFetchError,
  Oauth2RequestError,
} from "@paperwait/core/errors/oauth2";
import * as EntraId from "@paperwait/core/oauth2/entra-id";
import * as Google from "@paperwait/core/oauth2/google";
import {
  ENTRA_ID,
  GOOGLE,
  oauth2ProviderVariants,
} from "@paperwait/core/oauth2/shared";
import { oauth2ProvidersTable } from "@paperwait/core/oauth2/sql";
import { organizationsTable } from "@paperwait/core/organizations/sql";
import * as PapercutApi from "@paperwait/core/papercut/api";
import * as Realtime from "@paperwait/core/realtime";
import * as Replicache from "@paperwait/core/replicache";
import * as Users from "@paperwait/core/users";
import { usersTable } from "@paperwait/core/users/sql";
import { nanoIdSchema } from "@paperwait/core/utils/schemas";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { authorization } from "~/api/middleware";

import type { UserInfo } from "@paperwait/core/oauth2/shared";
import type { IdToken, Oauth2Tokens } from "@paperwait/core/oauth2/tokens";

export default new Hono()
  // Login
  .get(
    "/login",
    vValidator(
      "query",
      v.object({ org: v.string(), redirect: v.optional(v.string()) }),
    ),
    async (c) => {
      const { org: orgParam, redirect } = c.req.valid("query");

      const org = await db
        .select({
          id: organizationsTable.id,
          oauth2ProviderId: oauth2ProvidersTable.id,
          oauth2ProviderVariant: oauth2ProvidersTable.variant,
        })
        .from(organizationsTable)
        .where(
          or(
            eq(
              sql`TRIM(LOWER(${organizationsTable.name}))`,
              sql`TRIM(LOWER(${orgParam}))`,
            ),
            eq(
              sql`TRIM(LOWER(${organizationsTable.slug}))`,
              sql`TRIM(LOWER(${orgParam}))`,
            ),
          ),
        )
        .innerJoin(
          oauth2ProvidersTable,
          and(
            eq(organizationsTable.oauth2ProviderId, oauth2ProvidersTable.id),
            eq(organizationsTable.id, oauth2ProvidersTable.orgId),
          ),
        )
        .then((rows) => rows.at(0));
      if (!org) throw new NotFound("Organization not found");

      let state: string;
      let codeVerifier: string;
      let authorizationUrl: URL;
      switch (org.oauth2ProviderVariant) {
        case ENTRA_ID: {
          const entraId = EntraId.createAuthorizationUrl();
          state = entraId.state;
          codeVerifier = entraId.codeVerifier;
          authorizationUrl = entraId.authorizationUrl;
          break;
        }
        case GOOGLE: {
          const google = Google.createAuthorizationUrl(org.oauth2ProviderId);
          state = google.state;
          codeVerifier = google.codeVerifier;
          authorizationUrl = google.authorizationUrl;
          break;
        }
        default: {
          org.oauth2ProviderVariant satisfies never;

          throw new NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${org.oauth2ProviderVariant}" not implemented`,
          );
        }
      }

      (
        [
          ["provider", org.oauth2ProviderVariant],
          ["state", state],
          ["code_verifier", codeVerifier],
          ["orgId", org.id],
          ["redirect", redirect],
        ] as const
      ).forEach(([name, value]) => {
        if (value)
          setCookie(c, name, value, {
            path: "/",
            secure: Resource.Meta.app.stage === "production",
            httpOnly: true,
            maxAge: 60 * 10, // 10 minutes
            sameSite: "lax",
          });
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
        orgId: v.string(),
        redirect: v.fallback(v.string(), "/dashboard"),
      }),
    ),
    async (c) => {
      const { code } = c.req.valid("query");
      const { provider, code_verifier, orgId, redirect } =
        c.req.valid("cookie");

      let tokens: Oauth2Tokens;
      let idToken: IdToken;
      switch (provider) {
        case ENTRA_ID: {
          tokens = await EntraId.validateAuthorizationCode(
            code,
            code_verifier,
          ).catch(rethrowHttpError);
          idToken = EntraId.parseIdToken(tokens.idToken());
          break;
        }
        case GOOGLE: {
          tokens = await Google.validateAuthorizationCode(
            code,
            code_verifier,
          ).catch(rethrowHttpError);
          idToken = Google.parseIdToken(tokens.idToken());
          break;
        }
        default: {
          provider satisfies never;

          throw new NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${provider}" not implemented`,
          );
        }
      }

      const org = await db
        .select({ status: organizationsTable.status })
        .from(organizationsTable)
        .where(
          and(
            eq(organizationsTable.oauth2ProviderId, idToken.providerId),
            eq(organizationsTable.id, orgId),
          ),
        )
        .then((rows) => rows.at(0));
      if (!org)
        throw new NotFound(
          `Organization "${orgId}" not found with oauth2 provider "${idToken.providerId}"`,
        );

      const userExists = await PapercutApi.isUserExists(idToken.username);
      if (!userExists)
        throw new Unauthorized("User does not exist in PaperCut");

      let userInfo: UserInfo;
      switch (provider) {
        case ENTRA_ID:
          userInfo = await EntraId.getUserInfo(tokens.accessToken());
          break;
        case GOOGLE:
          userInfo = await Google.getUserInfo(tokens.accessToken());
          break;
        default: {
          provider satisfies never;

          throw new NotImplemented(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${provider}" not implemented`,
          );
        }
      }

      const { cookie } = await withTransaction(async (tx) => {
        const existingUser = await tx
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            username: usersTable.username,
            role: usersTable.role,
            deletedAt: usersTable.deletedAt,
          })
          .from(usersTable)
          .where(
            and(
              eq(usersTable.oauth2UserId, idToken.userId),
              eq(usersTable.orgId, orgId),
            ),
          )
          .then((rows) => rows.at(0));

        if (!existingUser) {
          if (org.status === "suspended")
            throw new Unauthorized("Organization is suspended");

          const newUser = await Users.create({
            orgId,
            oauth2UserId: idToken.userId,
            name: userInfo.name,
            username: idToken.username,
            email: userInfo.email,
          });
          if (!newUser) throw new Error("Failed to insert new user");

          await afterTransaction(() =>
            Replicache.poke([Realtime.formatChannel("org", orgId)]),
          );

          return Auth.createSession(newUser.id, { orgId }, tokens);
        }

        if (existingUser.deletedAt) throw new Unauthorized("User is deleted");

        const existingUserInfo = {
          name: existingUser.name,
          email: existingUser.email,
          username: existingUser.username,
        };
        const freshUserInfo = {
          name: userInfo.name,
          email: userInfo.email,
          username: idToken.username,
        };

        if (!R.isDeepEqual(existingUserInfo, freshUserInfo)) {
          await tx
            .update(usersTable)
            .set(freshUserInfo)
            .where(
              and(
                eq(usersTable.id, existingUser.id),
                eq(usersTable.orgId, orgId),
              ),
            );

          await afterTransaction(() =>
            Replicache.poke([Realtime.formatChannel("org", orgId)]),
          );
        }

        return Auth.createSession(existingUser.id, { orgId }, tokens);
      });

      setCookie(c, cookie.name, cookie.value, cookie.attributes);

      return c.redirect(redirect);
    },
  )
  // Logout
  .post("/logout", authorization(), async (c) => {
    const { session } = useAuthenticated();

    const { cookie } = await Auth.invalidateSession(session.id);

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
      if (!userExists) throw new NotFound(`User "${userId}" not found`);

      await Auth.invalidateUserSessions(userId);

      return c.body(null, 204);
    },
  );

function rethrowHttpError(error: Error): never {
  console.error(error);

  if (error instanceof Oauth2RequestError) throw new BadRequest(error.message);
  if (error instanceof ArcticFetchError)
    throw new InternalServerError(error.message);
  if (error instanceof Error) throw new InternalServerError(error.message);

  throw new InternalServerError("An unexpected error occurred");
}
