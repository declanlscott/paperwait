import {
  createSession,
  invalidateSession,
  invalidateUserSessions,
} from "@paperwait/core/auth";
import { db } from "@paperwait/core/database";
import {
  BadRequestError,
  handlePromiseResult,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import { NanoId } from "@paperwait/core/id";
import { Organization } from "@paperwait/core/organization";
import { isUserExists } from "@paperwait/core/papercut";
import { validate } from "@paperwait/core/valibot";
import { generateCodeVerifier, generateState } from "arctic";
import { and, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { validator } from "hono/validator";
import { parseJWT } from "oslo/jwt";
import * as v from "valibot";

import { authorize } from "~/api/lib/auth/authorize";
import entraId from "~/api/lib/auth/providers/entra-id";
import google from "~/api/lib/auth/providers/google";
import { getTokens, parseIdTokenPayload } from "~/api/lib/auth/tokens";
import { getUserInfo, processUser } from "~/api/lib/auth/user";
import { validateBindings } from "~/api/lib/bindings";
import { Registration } from "~/shared/lib/schemas";

import type { BindingsInput } from "~/api/lib/bindings";

export default new Hono<{ Bindings: BindingsInput }>()
  // Login
  .get(
    "/login",
    validator("query", (queryParams) =>
      validate(
        v.object({ org: v.string(), redirect: v.optional(v.string()) }),
        queryParams,
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

      const state = generateState();
      const codeVerifier = generateCodeVerifier();

      let url: URL;
      switch (org.provider) {
        case "entra-id": {
          url = await entraId.createAuthorizationURL(state, codeVerifier, {
            scopes: [
              "profile",
              "email",
              "offline_access",
              "User.Read",
              "User.ReadBasic.All",
            ],
          });
          break;
        }
        case "google": {
          url = await google.createAuthorizationURL(state, codeVerifier, {
            scopes: ["profile", "email"],
          });
          url.searchParams.set("hd", org.providerId);
          break;
        }
        default: {
          org.provider satisfies never;
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new InternalServerError(`Unknown provider: ${org.provider}`);
        }
      }

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

      c.redirect(url.toString());
    },
  )
  // Callback
  .get(
    "/callback",
    validator("query", (queryParams) =>
      validate(v.object({ code: v.string(), state: v.string() }), queryParams, {
        Error: BadRequestError,
        message: "Invalid query parameters",
      }),
    ),
    validator("cookie", (cookies) =>
      validate(
        v.object({
          provider: Registration.entries.authProvider,
          state: v.string(),
          code_verifier: v.string(),
          orgId: v.string(),
          redirect: v.fallback(v.string(), "/dashboard"),
        }),
        cookies,
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

      const tokens = await getTokens(provider, code, code_verifier);

      const idToken = parseJWT(tokens.idToken);

      const idTokenPayload = parseIdTokenPayload(provider, idToken?.payload);

      const [org] = await db
        .select({ status: Organization.status })
        .from(Organization)
        .where(
          and(
            eq(Organization.providerId, idTokenPayload.orgProviderId),
            eq(Organization.id, orgId),
          ),
        );
      if (!org)
        throw new NotFoundError(`
        Failed to find organization (${orgId}) with providerId: ${idTokenPayload.orgProviderId}
      `);

      const results = await Promise.allSettled([
        isUserExists({
          orgId,
          input: { username: idTokenPayload.username },
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
        { idTokenPayload, info: userInfo },
      );

      const { cookie } = await createSession(userId, orgId);

      setCookie(c, cookie.name, cookie.value, cookie.attributes);

      return c.redirect(redirect);
    },
  )
  // Logout
  .post("/logout", async (c) => {
    const { session } = authorize(validateBindings(c.env));

    const { cookie } = await invalidateSession(session.id);

    setCookie(c, cookie.name, cookie.value, cookie.attributes);

    return c.json(null, { status: 204 });
  })
  // Logout user
  .post(
    "/logout/:userId",
    validator("param", (params) =>
      validate(v.object({ userId: NanoId }), params, {
        Error: BadRequestError,
        message: "Invalid parameters",
      }),
    ),
    async (c) => {
      const { userId } = c.req.valid("param");

      authorize(validateBindings(c.env), ["administrator"]);

      await invalidateUserSessions(userId);

      return c.json(null, { status: 204 });
    },
  );
