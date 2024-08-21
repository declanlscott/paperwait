import * as v from "valibot";

import { ORG_SLUG_PATTERN } from "../constants";

export const OrgSlug = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.regex(ORG_SLUG_PATTERN),
);
export type OrgSlug = v.InferOutput<typeof OrgSlug>;

export const Registration = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1)),
  slug: OrgSlug,
  licenseKey: v.pipe(v.string(), v.uuid()),
});
export type Registration = v.InferOutput<typeof Registration>;

export const IsOrgSlugValid = v.object({
  value: v.string(),
  isValid: v.boolean(),
});
export type IsOrgSlugValid = v.InferOutput<typeof IsOrgSlugValid>;

export const MaxFileSizes = v.object({
  assets: v.pipe(v.number(), v.integer(), v.minValue(0)),
  documents: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type MaxFileSizes = v.InferOutput<typeof MaxFileSizes>;
