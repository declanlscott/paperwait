import { BadRequestError, HttpError } from "@paperwait/core/errors";
import { push, PushRequest } from "@paperwait/core/replicache";
import { parseSchema } from "@paperwait/core/utils";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context);

    const requestBody = await context.request.json();

    const pushResult = await push(
      user,
      parseSchema(PushRequest, requestBody, {
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

    return new Response("Internal server error", { status: 500 });
  }
}
