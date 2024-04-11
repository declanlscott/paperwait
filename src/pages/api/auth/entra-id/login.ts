import { generateCodeVerifier, generateState } from "arctic";

import entraId from "~/lib/auth/entra-id";
import { MissingParameterError } from "~/lib/error";

import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const org = context.url.searchParams.get("org");
    if (!org) {
      throw new MissingParameterError("No org provided");
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

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
  } catch (e) {
    console.error(e);

    if (e instanceof MissingParameterError) {
      return new Response(e.message, { status: e.statusCode });
    }

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
