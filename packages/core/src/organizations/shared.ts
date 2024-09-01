import * as v from "valibot";

import { ORG_SLUG_PATTERN } from "../constants";
import { licenseStatuses } from "../drizzle/enums";
import { oAuth2ProvidersSchema } from "../oauth2/shared";
import { nanoIdSchema, timestampsSchema } from "../utils/schemas";

export const licensesTableName = "licenses";

export const licenseSchema = v.object({
  key: v.pipe(v.string(), v.uuid()),
  orgId: nanoIdSchema,
  status: v.picklist(licenseStatuses),
});

export const organizationsTableName = "organizations";

export const orgStatuses = ["initializing", "active", "suspended"] as const;
export type OrgStatus = (typeof orgStatuses)[number];

export const organizationSchema = v.object({
  id: nanoIdSchema,
  slug: v.pipe(v.string(), v.regex(ORG_SLUG_PATTERN)),
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

const registrationStepsSchemas = [
  v.object({
    licenseKey: licenseSchema.entries.key,
    orgName: organizationSchema.entries.name,
    orgSlug: organizationSchema.entries.slug,
  }),
  v.object({
    oAuth2ProviderVariant: oAuth2ProvidersSchema.entries.variant,
    oAuth2ProviderId: oAuth2ProvidersSchema.entries.id,
  }),
  v.object({
    papercutAuthToken: v.string(),
    tailscaleOAuth2ClientId: v.string(),
    tailscaleOAuth2ClientSecret: v.string(),
  }),
] as const;

export const registrationStep1Schema = v.object({
  ...registrationStepsSchemas[0].entries,
  ...v.partial(registrationStepsSchemas[1]).entries,
  ...v.partial(registrationStepsSchemas[2]).entries,
});
export type RegistrationStep1 = v.InferOutput<typeof registrationStep1Schema>;

export const registrationStep2Schema = v.object({
  ...registrationStepsSchemas[0].entries,
  ...registrationStepsSchemas[1].entries,
  ...v.partial(registrationStepsSchemas[2]).entries,
});
export type RegistrationStep2 = v.InferOutput<typeof registrationStep2Schema>;

export const registrationStep3Schema = v.object({
  ...registrationStepsSchemas[0].entries,
  ...registrationStepsSchemas[1].entries,
  ...registrationStepsSchemas[2].entries,
});
export type RegistrationStep3 = v.InferOutput<typeof registrationStep3Schema>;

export const registrationSchema = registrationStep3Schema;
export type Registration = v.InferOutput<typeof registrationSchema>;
