import {
  BadRequestError,
  DatabaseError,
  HttpError,
} from "@paperwait/core/errors";
import { pull, PullRequest } from "@paperwait/core/replicache";
import { validate } from "@paperwait/core/valibot";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context);

    const requestBody = await context.request.json();

    const pullResult = await pull(
      user,
      validate(PullRequest, requestBody, {
        Error: BadRequestError,
        message: "Failed to parse pull request",
      }),
    );

    if (pullResult.type !== "success")
      throw new BadRequestError(JSON.stringify(pullResult.response));

    return new Response(JSON.stringify(pullResult.response), { status: 200 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("Internal server error", { status: 500 });
  }
}
