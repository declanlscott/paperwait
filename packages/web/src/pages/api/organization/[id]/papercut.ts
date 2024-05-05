import { putParameter } from "@paperwait/core/aws";
import {
  BadRequestError,
  ForbiddenError,
  HttpError,
} from "@paperwait/core/errors";
import { papercutSchema } from "@paperwait/core/papercut";
import { parseSchema } from "@paperwait/core/utils";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context, new Set(["administrator"]));

    if (context.params.id! !== user.orgId) {
      throw new ForbiddenError();
    }

    const body = await context.request.json();
    const data = parseSchema(papercutSchema, body, {
      className: BadRequestError,
      message: "Failed to parse papercut config",
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

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
