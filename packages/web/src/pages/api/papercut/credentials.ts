import { putParameter } from "@paperwait/core/aws";
import { BadRequestError, HttpError } from "@paperwait/core/errors";
import { PapercutParameter } from "@paperwait/core/papercut";
import { validate } from "@paperwait/core/valibot";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function PUT(context: APIContext) {
  try {
    const { user } = authorize(context, ["administrator"]);

    const body = await context.request.json();
    const data = validate(PapercutParameter, body, {
      Error: BadRequestError,
      message: "Failed to parse PaperCut parameter",
    });

    await putParameter({
      Name: `/paperwait/org/${user.orgId}/papercut`,
      Value: JSON.stringify(data),
      Type: "SecureString",
      Overwrite: true,
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });

    return new Response("Internal server error", { status: 500 });
  }
}
