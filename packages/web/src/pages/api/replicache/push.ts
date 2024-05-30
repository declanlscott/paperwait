import {
  BadRequestError,
  DatabaseError,
  HttpError,
} from "@paperwait/core/errors";
import { push, PushRequest } from "@paperwait/core/replicache";
import { validate } from "@paperwait/core/valibot";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context);

    const requestBody = await context.request.json();

    const pushResult = await push(
      user,
      validate(PushRequest, requestBody, {
        Error: BadRequestError,
        message: "Failed to parse push request",
      }),
    );

    if (pushResult.type !== "success")
      throw new BadRequestError(JSON.stringify(pushResult.response));

    return new Response(undefined, { status: 200 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("Internal server error", { status: 500 });
  }
}
