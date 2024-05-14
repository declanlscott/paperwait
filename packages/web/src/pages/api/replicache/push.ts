import { HttpError } from "@paperwait/core/errors";
import { push } from "@paperwait/core/replicache";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(
      context,
      new Set(["administrator", "technician", "manager", "customer"]),
    );

    const requestBody = await context.request.json();

    await push(user, requestBody);

    return new Response(undefined, { status: 200 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("Internal Server Error", { status: 500 });
  }
}
