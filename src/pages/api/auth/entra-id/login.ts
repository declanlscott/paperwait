import { generateCodeVerifier, generateState } from "arctic";
import { eq } from "drizzle-orm";

import { entraId } from "~/lib/auth";
import { db } from "~/lib/db";
import { Organization } from "~/lib/db/schema";

import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  const orgSlug = context.url.searchParams.get("org");
  if (!orgSlug) {
    return new Response(null, { status: 400 });
  }

  const org = await db
    .select({ id: Organization.id })
    .from(Organization)
    .where(eq(Organization.slug, orgSlug));
  if (!org.length) {
    return new Response(null, { status: 404 });
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = await entraId.createAuthorizationURL(state, codeVerifier);

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
  context.cookies.set("org_id", org[0].id, {
    secure: import.meta.env.PROD,
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
  });

  return context.redirect(url.toString());
}
