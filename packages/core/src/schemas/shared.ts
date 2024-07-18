import * as v from "valibot";

import { Provider } from "../organization/organization.sql";
import { PapercutParameter } from "./papercut";

export const Registration = v.pipe(
  v.object({
    ...v.object({
      name: v.pipe(v.string(), v.trim(), v.minLength(1)),
      slug: v.pipe(v.string(), v.trim(), v.minLength(1)),
      authProvider: v.picklist(Provider.enumValues),
      providerId: v.string(),
    }).entries,
    ...PapercutParameter.entries,
  }),
  v.check(({ authProvider, providerId }) => {
    if (authProvider === "entra-id")
      return v.safeParse(v.pipe(v.string(), v.uuid()), providerId).success;

    return true;
  }),
);
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
