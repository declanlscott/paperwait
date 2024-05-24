import { putParameter } from "@paperwait/core/aws";
import {
  BadRequestError,
  ForbiddenError,
  HttpError,
} from "@paperwait/core/errors";
import { PaperCutParameter } from "@paperwait/core/papercut";
import { parseSchema } from "@paperwait/core/valibot";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context, ["administrator"]);

    if (context.params.id! !== user.orgId) {
      throw new ForbiddenError();
    }

    const body = await context.request.json();
    const data = parseSchema(PaperCutParameter, body, {
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
