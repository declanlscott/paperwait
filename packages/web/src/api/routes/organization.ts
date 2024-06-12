import { deleteParameter, putParameter } from "@paperwait/core/aws";
import { db } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { Room } from "@paperwait/core/room";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import * as v from "valibot";

import { isOrgSlugValid } from "~/api/lib/organization";
import { Registration } from "~/shared/lib/schemas";

import type { BindingsInput } from "~/api/lib/bindings";

export default new Hono<{ Bindings: BindingsInput }>()
  .post(
    "/",
    honoValidator(
      "form",
      validator(Registration, {
        Error: BadRequestError,
        message: "Invalid form data",
      }),
    ),
    async (c) => {
      const registration = c.req.valid("form");

      let putParameterCommandOutput:
        | Awaited<ReturnType<typeof putParameter>>
        | undefined;

      let org: Pick<Organization, "id" | "slug"> | undefined;

      try {
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

        return c.redirect(`/org/${org.slug}`);
      } catch (e) {
        // Rollback the parameter if the transaction fails
        if (org && putParameterCommandOutput)
          await deleteParameter({
            Name: `/paperwait/org/${org.id}/papercut`,
          });

        throw e;
      }
    },
  )
  .post(
    "/:slug",
    honoValidator(
      "param",
      validator(v.object({ slug: v.string() }), {
        Error: BadRequestError,
        message: "Invalid path parameters",
      }),
    ),
    async (c) => {
      const isValid = await isOrgSlugValid(c.req.valid("param").slug);

      return c.json({ isValid }, { status: 501 });
    },
  );
