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
  PAPERCUT_PARAMETER_NAME,
} from "@paperwait/core/constants";
import { transact } from "@paperwait/core/database";
import { BadRequestError } from "@paperwait/core/errors";
import { Organization } from "@paperwait/core/organization";
import { Room } from "@paperwait/core/room";
import { Registration } from "@paperwait/core/schemas";
import { validator } from "@paperwait/core/valibot";
import { Hono } from "hono";
import { validator as honoValidator } from "hono/validator";
import * as v from "valibot";

import { isOrgSlugValid } from "~/api/lib/organization";

import type { HonoEnv } from "~/api/types";

export default new Hono<HonoEnv>()
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

      let org: Pick<Organization, "id" | "slug"> | undefined;

      const result = await transact(
        async (tx) => {
          org = await tx
            .insert(Organization)
            .values({
              name: registration.name,
              slug: registration.slug,
              provider: registration.authProvider,
              providerId: registration.providerId,
            })
            .returning({ id: Organization.id, slug: Organization.slug })
            .execute()
            .then((rows) => rows.at(0));

          if (!org) return tx.rollback();

          await Promise.all([
            // Store the PaperCut server details in SSM
            putSsmParameter({
              Name: buildSsmParameterPath(org.id, PAPERCUT_PARAMETER_NAME),
              Type: "SecureString",
              Value: JSON.stringify({
                serverUrl: registration.serverUrl,
                authToken: registration.authToken,
              }),
              Overwrite: false,
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
              Name: buildSsmParameterPath(
                org.id,
                MAX_FILE_SIZES_PARAMETER_NAME,
              ),
              Type: "String",
              Value: JSON.stringify(defaultMaxFileSizes),
              Overwrite: false,
            }),
            // Create a default room for the organization
            tx
              .insert(Room)
              .values({ name: "Default", status: "draft", orgId: org.id }),
          ]);

          return { org };
        },
        {
          onRollback: async () => {
            if (org) {
              // Rollback the parameters if the transaction fails
              await Promise.all([
                deleteSsmParameter({
                  Name: buildSsmParameterPath(org.id, PAPERCUT_PARAMETER_NAME),
                }),
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

      return c.json({ isValid });
    },
  );
