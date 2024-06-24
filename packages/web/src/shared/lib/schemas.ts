import { Provider } from "@paperwait/core/organization";
import { PapercutParameter } from "@paperwait/core/schemas";
import * as v from "valibot";

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
