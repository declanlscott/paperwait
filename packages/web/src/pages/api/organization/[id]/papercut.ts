import { PutParameterCommand } from "@aws-sdk/client-ssm";
import { ForbiddenError, HttpError } from "@paperwait/core/errors";
import { papercutSchema } from "@paperwait/core/papercut";
import { parse, ValiError } from "valibot";

import { authorize } from "~/lib/auth/authorize";
import { client as ssmClient } from "~/lib/ssm";

import type { PutParameterCommandInput } from "@aws-sdk/client-ssm";
import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context, new Set(["administrator"]));

    if (context.params.id! !== user.orgId) {
      throw new ForbiddenError();
    }

    const body = await context.request.json();
    const data = parse(papercutSchema, body);

    await ssmClient.send(
      new PutParameterCommand({
        Name: `/paperwait/org/${user.orgId}/papercut`,
        Value: JSON.stringify(data),
        Type: "SecureString",
        Overwrite: true,
      } satisfies PutParameterCommandInput),
    );

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof ValiError) return new Response(e.message, { status: 400 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
