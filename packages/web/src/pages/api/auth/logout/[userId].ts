import { invalidateUserSessions } from "@paperwait/core/auth";
import { BadRequestError, HttpError } from "@paperwait/core/errors";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    authorize(context, ["administrator"]);

    if (!context.params.userId)
      throw new BadRequestError("missing userId parameter");

    await invalidateUserSessions(context.params.userId);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("Internal server error", { status: 500 });
  }
}
