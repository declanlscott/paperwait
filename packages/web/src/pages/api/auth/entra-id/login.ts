import { db } from "@paperwait/core/database";
import {
  DatabaseError,
  HTTPError,
  MissingParameterError,
  NotFoundError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { generateCodeVerifier, generateState } from "arctic";
import { eq, or, sql } from "drizzle-orm";

import entraId from "~/lib/auth/entra-id";

import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const orgParam = context.url.searchParams.get("org");
    if (!orgParam) {
      throw new MissingParameterError("No org provided");
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const [org] = await db
      .select({ id: Organization.id, provider: Organization.provider })
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
    if (!org) {
      throw new NotFoundError("Organization not found");
    }
    if (org.provider === "google") {
      throw new NotImplementedError("Google SSO is not yet implemented");
    }

    const url = await entraId.createAuthorizationURL(state, codeVerifier, {
      scopes: ["profile", "email"],
    });

    // store state verifier as cookie
    context.cookies.set("state", state, {
      path: "/",
      secure: import.meta.env.PROD,
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: "lax",
    });

    // store code verifier as cookie
    context.cookies.set("code_verifier", codeVerifier, {
      secure: import.meta.env.PROD,
      path: "/",
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: "lax",
    });

    // store the org id as a cookie
    context.cookies.set("org", org.id, {
      secure: import.meta.env.PROD,
      path: "/",
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: "lax",
    });

    const redirect = context.url.searchParams.get("redirect");
    if (redirect) {
      // store the redirect URL as a cookie
      context.cookies.set("redirect", redirect, {
        secure: import.meta.env.PROD,
        path: "/",
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutes
        sameSite: "lax",
      });
    }

    return context.redirect(url.toString());
  } catch (e) {
    console.error(e);

    if (e instanceof HTTPError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
