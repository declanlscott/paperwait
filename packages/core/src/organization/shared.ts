import * as v from "valibot";

import { nanoIdSchema, timestampsSchema } from "../utils/schemas";

export const licensesTableName = "licenses";
export const organizationsTableName = "organizations";

export const orgStatuses = ["initializing", "active", "suspended"] as const;
export type OrgStatus = (typeof orgStatuses)[number];

export const organizationSchema = v.object({
  id: nanoIdSchema,
  slug: v.string(),
  name: v.string(),
  status: v.picklist(orgStatuses),
  licenseKey: v.pipe(v.string(), v.uuid()),
  oAuth2ProviderId: v.nullable(v.string()),
  ...timestampsSchema.entries,
});

export const organizationMutationNames = ["updateOrganization"] as const;

export const updateOrganizationMutationArgsSchema = v.object({
  id: nanoIdSchema,
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  ...v.partial(
    v.omit(organizationSchema, [
      "id",
      "licenseKey",
      "oAuth2ProviderId",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]),
  ).entries,
});
export type UpdateOrganizationMutationArgs = v.InferOutput<
  typeof updateOrganizationMutationArgsSchema
>;
