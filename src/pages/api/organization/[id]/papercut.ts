import { PutParameterCommand } from "@aws-sdk/client-ssm";
import { z } from "astro/zod";

import { ForbiddenError, UnauthorizedError } from "~/lib/error";
import { schema } from "~/lib/papercut";
import { client as ssmClient } from "~/lib/ssm";

import type { PutParameterCommandInput } from "@aws-sdk/client-ssm";
import type { APIContext } from "astro";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    if (!context.locals.session || !context.locals.user) {
      throw new UnauthorizedError();
    }

    if (context.locals.user.role !== "admin") {
      throw new ForbiddenError();
    }

    if (context.params.id! !== context.locals.user.orgId) {
      throw new ForbiddenError();
    }

    const body = (await context.request.json()) as unknown;
    const data = schema.parse(body);

    const input = {
      Name: `/paperwait/org/${context.locals.user.orgId}/papercut`,
      Value: JSON.stringify(data),
      Type: "SecureString",
      Overwrite: true,
    } satisfies PutParameterCommandInput;

    const command = new PutParameterCommand(input);

    await ssmClient.send(command);

    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);

    if (e instanceof z.ZodError)
      return new Response(e.message, { status: 400 });

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
