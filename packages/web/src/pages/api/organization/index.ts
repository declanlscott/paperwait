import {
  ParameterAlreadyExists,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { db } from "@paperwait/core/database";
import {
  DatabaseError,
  HttpError,
  NotImplementedError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { parse, ValiError } from "valibot";

import { registrationSchema } from "~/lib/schemas";
import { client as ssmClient } from "~/lib/ssm";

import type { PutParameterCommandInput } from "@aws-sdk/client-ssm";
import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const formData = await context.request.formData();
    const registration = parse(
      registrationSchema,
      Object.fromEntries(formData.entries()),
    );

    if (registration.ssoProvider === "google") {
      throw new NotImplementedError("Google SSO is not yet implemented");
    }

    const org = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(Organization)
        .values({
          name: registration.name,
          slug: registration.slug,
          provider: registration.ssoProvider,
          tenantId: registration.tenantId,
        })
        .returning({ id: Organization.id, slug: Organization.slug });

      await ssmClient.send(
        new PutParameterCommand({
          Name: `/paperwait/org/${org.id}/papercut`,
          Value: JSON.stringify({
            serverUrl: registration.serverUrl,
            authToken: registration.authToken,
          }),
          Type: "SecureString",
          Overwrite: false,
        } satisfies PutParameterCommandInput),
      );

      return org;
    });

    return context.redirect(
      `/api/auth/${registration.ssoProvider}/login?org=${encodeURIComponent(org.slug)}`,
    );
  } catch (e) {
    console.error(e);

    if (e instanceof ValiError) return new Response(e.message, { status: 400 });
    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });
    if (e instanceof ParameterAlreadyExists)
      return new Response(
        "Papercut configuration already exists for this organization",
        { status: 409 },
      );

    return new Response("An unexpected error occurred", { status: 500 });
  }
}
