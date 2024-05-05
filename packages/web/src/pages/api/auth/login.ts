import { db } from "@paperwait/core/database";
import {
  BadRequestError,
  DatabaseError,
  HttpError,
  InternalServerError,
  NotFoundError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { generateCodeVerifier, generateState } from "arctic";
import { eq, or, sql } from "drizzle-orm";

import entraId from "~/lib/auth/entra-id";
import google from "~/lib/auth/google";

import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  try {
    const orgParam = context.url.searchParams.get("org");
    if (!orgParam) {
      throw new BadRequestError("No org provided");
    }

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
    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    let url: URL;
    switch (org.provider) {
      case "entra-id": {
        url = await entraId.createAuthorizationURL(state, codeVerifier, {
          scopes: ["profile", "email"],
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
    context.cookies.set("provider", org.provider, {
      path: "/",
      secure: import.meta.env.PROD,
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: "lax",
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

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
