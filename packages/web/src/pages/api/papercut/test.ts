import { BadRequestError, HttpError } from "@paperwait/core/errors";
import { testPapercut } from "@paperwait/core/papercut";
import { validate } from "@paperwait/core/valibot";
import { object, string } from "valibot";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  const formData = await context.request.formData();

  try {
    const { orgId, authToken } = validate(
      object({
        orgId: string(),
        authToken: string(),
      }),
      Object.fromEntries(formData.entries()),
      { Error: BadRequestError },
    );

    await testPapercut({ orgId, input: { authToken } });

    return new Response(undefined, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("Internal server error", { status: 500 });
  }
}
