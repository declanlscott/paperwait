import { PutParameterCommand } from "@aws-sdk/client-ssm";
import { ForbiddenError } from "@paperwait/core/errors";
import { schema } from "@paperwait/core/papercut";
import { parse, ValiError } from "valibot";

import { authorize } from "~/lib/auth/authorize";
import { client as ssmClient } from "~/lib/ssm";

import type { PutParameterCommandInput } from "@aws-sdk/client-ssm";
import type { APIContext } from "astro";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const { user } = authorize(context, "administrator");

    if (context.params.id! !== user.orgId) {
      throw new ForbiddenError();
    }

    const body = await context.request.json();
    const data = parse(schema, body);

    const input = {
      Name: `/paperwait/org/${user.orgId}/papercut`,
      Value: JSON.stringify(data),
      Type: "SecureString",
      Overwrite: true,
    } satisfies PutParameterCommandInput;

    const command = new PutParameterCommand(input);

    await ssmClient.send(command);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof ValiError) return new Response(e.message, { status: 400 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
