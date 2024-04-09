import { NeonDbError } from "@neondatabase/serverless";
import { OAuth2RequestError } from "arctic";
import { z } from "astro/zod";
import { and, eq, or, sql } from "drizzle-orm";
import ky from "ky";
import { parseJWT } from "oslo/jwt";

import { entraId, lucia } from "~/lib/auth";
import { db } from "~/lib/db";
import { Organization, User } from "~/lib/db/schema";
import { MissingParameterError, NotFoundError } from "~/lib/error";

import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  const code = context.url.searchParams.get("code");
  const state = context.url.searchParams.get("state");

  const storedState = context.cookies.get("state");
  const storedCodeVerifier = context.cookies.get("code_verifier");
  const storedOrg = context.cookies.get("org");

  const redirect = context.cookies.get("redirect")?.value ?? "/dashboard";

  if (!code || !state || !storedState || !storedCodeVerifier || !storedOrg) {
    throw new MissingParameterError("Missing required parameters");
  }

  try {
    const tokens = await entraId.validateAuthorizationCode(
      code,
      storedCodeVerifier.value,
    );

    const parsedIdToken = parseJWT(tokens.idToken)!;
    const providerId = parsedIdToken.subject!;
    const { tid: tenantId } = z
      .object({ tid: z.string() })
      .parse(parsedIdToken.payload);

    const org = await db
      .select({ id: Organization.id })
      .from(Organization)
      .where(
        and(
          eq(Organization.tenantId, tenantId),
          or(
            eq(
              sql`TRIM(LOWER(${Organization.name}))`,
              sql`TRIM(LOWER(${storedOrg.value}))`,
            ),
            eq(
              sql`TRIM(LOWER(${Organization.slug}))`,
              sql`TRIM(LOWER(${storedOrg.value}))`,
            ),
          ),
        ),
      );
    if (!org.length) {
      throw new NotFoundError(`
        Failed to find organization (${storedOrg.value}) with tenantId: ${tenantId}
      `);
    }

    const existingUser = await db
      .select({ id: User.id })
      .from(User)
      .where(eq(User.providerId, providerId));

    if (existingUser.length) {
      const session = await lucia.createSession(existingUser[0].id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      context.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );

      return context.redirect(redirect);
    }

    const userInfo = await ky
      .get("https://graph.microsoft.com/oidc/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })
      .json<EntraIdUserInfo>();

    const newUser = await db
      .insert(User)
      .values({
        providerId,
        orgId: org[0].id,
        name: userInfo.name,
      })
      .returning({ id: User.id });

    const session = await lucia.createSession(newUser[0].id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return context.redirect(redirect);
  } catch (e) {
    console.error(e);

    if (e instanceof MissingParameterError)
      return new Response(e.message, { status: 400 });
    if (e instanceof OAuth2RequestError)
      return new Response(e.message, { status: 400 });
    if (e instanceof z.ZodError)
      return new Response(e.message, { status: 500 });
    if (e instanceof NotFoundError)
      return new Response(e.message, { status: 404 });
    if (e instanceof NeonDbError)
      return new Response(e.message, { status: 500 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}

type EntraIdUserInfo = {
  sub: string;
  name: string;
  family_name: string;
  given_name: string;
  picture: string;
  email: string;
};
