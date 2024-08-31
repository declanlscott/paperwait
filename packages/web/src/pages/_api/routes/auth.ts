import { vValidator } from "@hono/valibot-validator";
import * as Auth from "@paperwait/core/auth";
import { useAuthenticated } from "@paperwait/core/auth/context";
import { and, db, eq, or, sql } from "@paperwait/core/drizzle";
import {
  afterTransaction,
  withTransaction,
} from "@paperwait/core/drizzle/transaction";
import {
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
} from "@paperwait/core/errors/http";
import * as EntraId from "@paperwait/core/oauth2/entra-id";
import * as Google from "@paperwait/core/oauth2/google";
import {
  ENTRA_ID,
  GOOGLE,
  oAuth2ProviderVariants,
} from "@paperwait/core/oauth2/shared";
import { oAuth2Providers } from "@paperwait/core/oauth2/sql";
import { organizations } from "@paperwait/core/organization/sql";
import * as PapercutApi from "@paperwait/core/papercut/api";
import * as Realtime from "@paperwait/core/realtime";
import * as Replicache from "@paperwait/core/replicache";
import * as User from "@paperwait/core/user";
import { users } from "@paperwait/core/user/sql";
import { nanoIdSchema } from "@paperwait/core/utils/schemas";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import * as R from "remeda";
import * as v from "valibot";

import { authorization } from "~/api/middleware";

import type { UserInfo } from "@paperwait/core/oauth2/shared";
import type { IdToken, OAuth2Tokens } from "@paperwait/core/oauth2/tokens";

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
          id: organizations.id,
          oAuth2ProviderId: oAuth2Providers.id,
          oAuth2ProviderVariant: oAuth2Providers.variant,
        })
        .from(organizations)
        .where(
          or(
            eq(
              sql`TRIM(LOWER(${organizations.name}))`,
              sql`TRIM(LOWER(${orgParam}))`,
            ),
            eq(
              sql`TRIM(LOWER(${organizations.slug}))`,
              sql`TRIM(LOWER(${orgParam}))`,
            ),
          ),
        )
        .innerJoin(
          oAuth2Providers,
          and(
            eq(organizations.oAuth2ProviderId, oAuth2Providers.id),
            eq(organizations.id, oAuth2Providers.orgId),
          ),
        )
        .then((rows) => rows.at(0));
      if (!org) throw new NotFoundError("Organization not found");

      let state: string;
      let codeVerifier: string;
      let authorizationUrl: URL;
      switch (org.oAuth2ProviderVariant) {
        case ENTRA_ID: {
          const entraId = EntraId.createAuthorizationUrl();
          state = entraId.state;
          codeVerifier = entraId.codeVerifier;
          authorizationUrl = entraId.authorizationUrl;
          break;
        }
        case GOOGLE: {
          const google = Google.createAuthorizationUrl(org.oAuth2ProviderId);
          state = google.state;
          codeVerifier = google.codeVerifier;
          authorizationUrl = google.authorizationUrl;
          break;
        }
        default: {
          org.oAuth2ProviderVariant satisfies never;

          throw new NotImplementedError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${org.oAuth2ProviderVariant}" not implemented`,
          );
        }
      }

      // store the provider as a cookie
      setCookie(c, "provider", org.oAuth2ProviderVariant, {
        path: "/",
        secure: import.meta.env.PROD,
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax",
      });

      // store state verifier as cookie
      setCookie(c, "state", state, {
        path: "/",
        secure: import.meta.env.PROD,
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax",
      });

      // store code verifier as cookie
      setCookie(c, "code_verifier", codeVerifier, {
        secure: import.meta.env.PROD,
        path: "/",
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax",
      });

      // store the org id as a cookie
      setCookie(c, "orgId", org.id, {
        secure: import.meta.env.PROD,
        path: "/",
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax",
      });

      if (redirect) {
        setCookie(c, "redirect", redirect, {
          path: "/",
          secure: import.meta.env.PROD,
          httpOnly: true,
          maxAge: 60 * 10, // 10 minutes
          sameSite: "lax",
        });
      }

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
        provider: v.picklist(oAuth2ProviderVariants),
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

      let tokens: OAuth2Tokens;
      let idToken: IdToken;
      switch (provider) {
        case ENTRA_ID: {
          tokens = await EntraId.validateAuthorizationCode(code, code_verifier);
          idToken = EntraId.parseIdToken(tokens.idToken());
          break;
        }
        case GOOGLE: {
          tokens = await Google.validateAuthorizationCode(code, code_verifier);
          idToken = Google.parseIdToken(tokens.idToken());
          break;
        }
        default: {
          provider satisfies never;

          throw new NotImplementedError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${provider}" not implemented`,
          );
        }
      }

      const org = await db
        .select({ status: organizations.status })
        .from(organizations)
        .where(
          and(
            eq(organizations.oAuth2ProviderId, idToken.providerId),
            eq(organizations.id, orgId),
          ),
        )
        .execute()
        .then((rows) => rows.at(0));
      if (!org)
        throw new NotFoundError(
          `Organization "${orgId}" not found with oauth2 provider "${idToken.providerId}"`,
        );

      const userExists = await PapercutApi.isUserExists(idToken.username);
      if (!userExists)
        throw new UnauthorizedError("User does not exist in PaperCut");

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

          throw new NotImplementedError(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Provider "${provider}" not implemented`,
          );
        }
      }

      const userId = await withTransaction(async (tx) => {
        const existingUser = await tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            username: users.username,
            role: users.role,
            deletedAt: users.deletedAt,
          })
          .from(users)
          .where(
            and(eq(users.oAuth2UserId, idToken.userId), eq(users.orgId, orgId)),
          )
          .then((rows) => rows.at(0));

        if (!existingUser) {
          if (org.status === "suspended")
            throw new UnauthorizedError("Organization is suspended");

          const newUser = await User.create({
            orgId,
            oAuth2UserId: idToken.userId,
            name: userInfo.name,
            username: idToken.username,
            email: userInfo.email,
          });
          if (!newUser) throw new Error("Failed to insert new user");

          await afterTransaction(() =>
            Replicache.poke([Realtime.formatChannel("org", orgId)]),
          );

          return newUser.id;
        }

        if (existingUser.deletedAt)
          throw new UnauthorizedError("User is deleted");

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
            .update(users)
            .set(freshUserInfo)
            .where(and(eq(users.id, existingUser.id), eq(users.orgId, orgId)));

          await afterTransaction(() =>
            Replicache.poke([Realtime.formatChannel("org", orgId)]),
          );
        }

        return existingUser.id;
      });

      const { cookie } = await Auth.createSession(userId, { orgId }, tokens);

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

      const userExists = await User.exists(userId);
      if (!userExists) throw new NotFoundError(`User "${userId}" not found`);

      await Auth.invalidateUserSessions(userId);

      return c.body(null, 204);
    },
  );
