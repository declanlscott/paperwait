import { invalidateSession } from "@paperwait/core/auth";
import { HttpError } from "@paperwait/core/errors";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const { session } = authorize(context);

    const { cookie } = await invalidateSession(session.id);
    context.cookies.set(cookie.name, cookie.value, cookie.attributes);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
