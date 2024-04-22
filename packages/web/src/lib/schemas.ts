import { provider } from "@paperwait/core/organization";
import {
  boolean,
  literal,
  minLength,
  object,
  string,
  toTrimmed,
  union,
  uuid,
} from "valibot";

import type { Output } from "valibot";

export const registrationSchema = object({
  name: string([toTrimmed(), minLength(1)]),
  slug: string([toTrimmed(), minLength(1)]),
  ssoProvider: union(provider.enumValues.map((value) => literal(value))),
  tenantId: string([uuid()]),
});

export const orgSlugValiditySchema = object({
  value: string(),
  isValid: boolean(),
});

export type OrgSlugValidity = Output<typeof orgSlugValiditySchema>;
