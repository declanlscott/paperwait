import { provider } from "@paperwait/core/organization";
import { papercutSchema } from "@paperwait/core/papercut";
import {
  boolean,
  literal,
  merge,
  minLength,
  object,
  string,
  toTrimmed,
  union,
  uuid,
} from "valibot";

import type { Output } from "valibot";

export const registrationSchema = merge([
  object({
    name: string([toTrimmed(), minLength(1)]),
    slug: string([toTrimmed(), minLength(1)]),
    authProvider: union(provider.enumValues.map((value) => literal(value))),
    tenantId: string([uuid()]),
  }),
  papercutSchema,
]);

export const orgSlugValiditySchema = object({
  value: string(),
  isValid: boolean(),
});

export type OrgSlugValidity = Output<typeof orgSlugValiditySchema>;
