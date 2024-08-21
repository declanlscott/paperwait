import { vValidator } from "@hono/valibot-validator";
import {
  buildSsmParameterPath,
  deleteSsmParameter,
  putSsmParameter,
} from "@paperwait/core/aws";
import {
  DEFAULT_DOCUMENTS_MIME_TYPES,
  defaultMaxFileSizes,
  DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
  MAX_FILE_SIZES_PARAMETER_NAME,
} from "@paperwait/core/constants";
import { transact } from "@paperwait/core/database";
import { License, Organization } from "@paperwait/core/organization";
import { Room } from "@paperwait/core/room";
import { OrgSlug, Registration } from "@paperwait/core/schemas";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";

import { isOrgSlugValid } from "~/api/lib/organization";
import infra from "~/api/routes/organizations/infra";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
  .post("/", vValidator("form", Registration), async (c) => {
    const values = c.req.valid("form");

    let org: Pick<Organization, "id" | "slug"> | undefined;

    const result = await transact(
      async (tx) => {
        org = await tx
          .insert(Organization)
          .values(values)
          .returning({ id: Organization.id, slug: Organization.slug })
          .execute()
          .then((rows) => rows.at(0));
        if (!org) return tx.rollback();

        await Promise.all([
          // Update the license with the org id
          tx
            .update(License)
            .set({ orgId: org.id })
            .where(eq(License.key, values.licenseKey)),
          // Create a default room for the organization
          tx.insert(Room).values({
            name: "Default",
            status: "draft",
            orgId: org.id,
            config: {
              workflow: [],
              deliveryOptions: [],
            },
          }),
          // Store the documents mime types in SSM
          putSsmParameter({
            Name: buildSsmParameterPath(
              org.id,
              DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
            ),
            Type: "StringList",
            Value: DEFAULT_DOCUMENTS_MIME_TYPES.join(","),
            Overwrite: false,
          }),
          // Store the max file sizes in SSM
          putSsmParameter({
            Name: buildSsmParameterPath(org.id, MAX_FILE_SIZES_PARAMETER_NAME),
            Type: "String",
            Value: JSON.stringify(defaultMaxFileSizes),
            Overwrite: false,
          }),
        ]);

        return { org };
      },
      {
        onRollback: async () => {
          if (org) {
            console.log("Rolling back ssm parameters for org", org.id);

            // Rollback the parameters if the transaction fails
            await Promise.all([
              deleteSsmParameter({
                Name: buildSsmParameterPath(
                  org.id,
                  DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
                ),
              }),
              deleteSsmParameter({
                Name: buildSsmParameterPath(
                  org.id,
                  MAX_FILE_SIZES_PARAMETER_NAME,
                ),
              }),
            ]);
          }

          return true;
        },
      },
    );

    if (result.status === "error") throw result.error;

    return c.redirect(`/org/${result.output.org.slug}`);
  })
  .post(
    "/:slug",
    vValidator("param", v.object({ slug: OrgSlug })),
    async (c) => {
      const isValid = await isOrgSlugValid(c.req.valid("param").slug);

      return c.json({ isValid });
    },
  )
  .route("/setup", infra);
