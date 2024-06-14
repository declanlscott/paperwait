import {
  createProviderAuthorizationUrl,
  createSession,
  getProviderTokens,
  invalidateSession,
  invalidateUserSessions,
  parseProviderIdToken,
} from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import {
  BadRequestError,
  handlePromiseResult,
  NotFoundError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import { NanoId } from "@paperwait/core/id";
import { Organization } from "@paperwait/core/organization";
import { isUserExists } from "@paperwait/core/papercut";
import { validator } from "@paperwait/core/valibot";
import { and, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { validator as honoValidator } from "hono/validator";
import * as v from "valibot";

import { getUserInfo, processUser } from "~/api/lib/auth/user";
import { authorization } from "~/api/middleware";
import { Registration } from "~/shared/lib/schemas";

export default new Hono()
  // Login
  .get(
    "/login",
    honoValidator(
      "query",
      validator(
        v.object({ org: v.string(), redirect: v.optional(v.string()) }),
        {
          Error: BadRequestError,
          message: "Invalid query parameters",
        },
      ),
    ),
    async (c) => {
      const { org: orgParam, redirect } = c.req.valid("query");

      const [org] = await db
        .select({
          id: Organization.id,
          provider: Organization.provider,
          providerId: Organization.providerId,
        })
        .from(Organization)
        .where(
          or(
            eq(
              sql`TRIM(LOWER(${Organization.name}))`,
              sql`TRIM(LOWER(${orgParam}))`,
            ),
            eq(
              sql`TRIM(LOWER(${Organization.slug}))`,
              sql`TRIM(LOWER(${orgParam}))`,
            ),
          ),
        );
      if (!org) throw new NotFoundError("Organization not found");

      const { authorizationUrl, state, codeVerifier } =
        await createProviderAuthorizationUrl(org);

      // store the provider as a cookie
      setCookie(c, "provider", org.provider, {
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
    honoValidator(
      "query",
      validator(v.object({ code: v.string(), state: v.string() }), {
        Error: BadRequestError,
        message: "Invalid query parameters",
      }),
    ),
    honoValidator(
      "cookie",
      validator(
        v.object({
          provider: Registration.entries.authProvider,
          state: v.string(),
          code_verifier: v.string(),
          orgId: v.string(),
          redirect: v.fallback(v.string(), "/dashboard"),
        }),
        {
          Error: BadRequestError,
          message: "Invalid cookies",
        },
      ),
    ),
    async (c) => {
      const { code } = c.req.valid("query");
      const { provider, code_verifier, orgId, redirect } =
        c.req.valid("cookie");

      const tokens = await getProviderTokens(provider, code, code_verifier);

      const idToken = parseProviderIdToken(provider, tokens.idToken);

      const [org] = await db
        .select({ status: Organization.status })
        .from(Organization)
        .where(
          and(
            eq(Organization.providerId, idToken.orgProviderId),
            eq(Organization.id, orgId),
          ),
        );
      if (!org)
        throw new NotFoundError(`
        Failed to find organization (${orgId}) with providerId: ${idToken.orgProviderId}
      `);

      const results = await Promise.allSettled([
        isUserExists({
          orgId,
          input: { username: idToken.username },
        }).then((exists) => {
          if (!exists)
            throw new UnauthorizedError("User does not exist in PaperCut");

          return exists;
        }),
        getUserInfo(provider, tokens.accessToken),
      ]);

      handlePromiseResult(results[0]);
      const userInfo = handlePromiseResult(results[1]);

      const userId = await processUser(
        { id: orgId, status: org.status },
        { idToken, info: userInfo },
      );

      const { cookie } = await createSession(userId, orgId, tokens);

      setCookie(c, cookie.name, cookie.value, cookie.attributes);

      return c.redirect(redirect);
    },
  )
  // Logout
  .post("/logout", authorization(), async (c) => {
    const { cookie } = await invalidateSession(c.get("locals").session!.id);

    setCookie(c, cookie.name, cookie.value, cookie.attributes);

    return c.body(null, { status: 204 });
  })
  // Logout user
  .post(
    "/logout/:userId",
    authorization(["administrator"]),
    honoValidator(
      "param",
      validator(v.object({ userId: NanoId }), {
        Error: BadRequestError,
        message: "Invalid parameters",
      }),
    ),
    async (c) => {
      const { userId } = c.req.valid("param");

      await invalidateUserSessions(userId);

      return c.body(null, { status: 204 });
    },
  );
