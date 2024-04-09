import { generateCodeVerifier, generateState } from "arctic";

import { entraId } from "~/lib/auth";

import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  const org = context.url.searchParams.get("org");
  if (!org) {
    console.error("No org provided");
    return new Response(null, { status: 400 });
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

  // store the org as a cookie
  context.cookies.set("org", org, {
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
}
