import { deleteParameter, putParameter } from "@paperwait/core/aws";
import { db } from "@paperwait/core/database";
import {
  BadRequestError,
  DatabaseError,
  HttpError,
} from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { Room } from "@paperwait/core/room";
import { validate } from "@paperwait/core/valibot";

import { Registration } from "~/lib/schemas";

import type { APIContext } from "astro";

export async function POST(context: APIContext) {
  let putParameterCommandOutput:
    | Awaited<ReturnType<typeof putParameter>>
    | undefined;

  let org: Pick<Organization, "id" | "slug"> | undefined;

  try {
    const formData = await context.request.formData();
    const registration = validate(
      Registration,
      Object.fromEntries(formData.entries()),
      { Error: BadRequestError, message: "Failed to parse registration" },
    );

    org = await db.transaction(async (tx) => {
      [org] = await tx
        .insert(Organization)
        .values({
          name: registration.name,
          slug: registration.slug,
          provider: registration.authProvider,
          providerId: registration.providerId,
        })
        .returning({ id: Organization.id, slug: Organization.slug });

      [putParameterCommandOutput] = await Promise.all([
        // Store the PaperCut server details in SSM
        putParameter({
          Name: `/paperwait/org/${org.id}/papercut`,
          Value: JSON.stringify({
            serverUrl: registration.serverUrl,
            authToken: registration.authToken,
          }),
          Type: "SecureString",
          Overwrite: false,
        }),
        // Create a default room for the organization
        tx
          .insert(Room)
          .values({ name: "Default", status: "draft", orgId: org.id }),
      ]);

      return org;
    });

    return context.redirect(`/org/${org.slug}`);
  } catch (e) {
    console.error(e);

    // Rollback the parameter if the transaction fails
    if (org && putParameterCommandOutput)
      await deleteParameter({
        Name: `/paperwait/org/${org.id}/papercut`,
      });

    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("Internal server error", { status: 500 });
  }
}
