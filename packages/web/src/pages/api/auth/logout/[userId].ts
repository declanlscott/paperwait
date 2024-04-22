import { invalidateUserSessions } from "@paperwait/core/auth";
import { HTTPError, MissingParameterError } from "@paperwait/core/errors";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    authorize(context, new Set(["administrator"]));

    if (!context.params.userId)
      throw new MissingParameterError("missing userId parameter");

    await invalidateUserSessions(context.params.userId);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof HTTPError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
