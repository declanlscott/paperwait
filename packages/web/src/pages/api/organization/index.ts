import { putParameter } from "@paperwait/core/aws";
import { DatabaseError, db } from "@paperwait/core/database";
import { BadRequestError, HttpError } from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { parseSchema } from "@paperwait/core/valibot";

import { Registration } from "~/lib/schemas";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    const formData = await context.request.formData();
    const registration = parseSchema(
      Registration,
      Object.fromEntries(formData.entries()),
      { Error: BadRequestError, message: "Failed to parse registration" },
    );

    const org = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(Organization)
        .values({
          name: registration.name,
          slug: registration.slug,
          provider: registration.authProvider,
          providerId: registration.providerId,
        })
        .returning({ id: Organization.id, slug: Organization.slug });

      await putParameter({
        Name: `/paperwait/org/${org.id}/papercut`,
        Value: JSON.stringify({
          serverUrl: registration.serverUrl,
          authToken: registration.authToken,
        }),
        Type: "SecureString",
        Overwrite: false,
      });

      return org;
    });

    return context.redirect(
      `/api/auth/login?org=${encodeURIComponent(org.slug)}`,
    );
  } catch (e) {
    console.error(e);

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("Internal server error", { status: 500 });
  }
}
