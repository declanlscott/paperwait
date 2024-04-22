import { provider } from "@paperwait/core/organization";
import {
  boolean,
  literal,
  minLength,
  object,
  string,
  union,
  uuid,
} from "valibot";

import type { Output } from "valibot";

export const registrationSchema = object({
  name: string([minLength(1)]),
  slug: string([minLength(1)]),
  ssoProvider: union(provider.enumValues.map((value) => literal(value))),
  tenantId: string([uuid()]),
});

export const orgSlugExistenceSchema = object({
  value: registrationSchema.entries.slug,
  exists: boolean(),
});

export type OrgSlugExistence = Output<typeof orgSlugExistenceSchema>;
