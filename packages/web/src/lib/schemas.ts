import { provider } from "@paperwait/core/organization";
import { PapercutParameter } from "@paperwait/core/papercut";
import {
  boolean,
  custom,
  fallback,
  literal,
  merge,
  minLength,
  object,
  safeParse,
  string,
  toTrimmed,
  transform,
  union,
  uuid,
} from "valibot";

import type { Output } from "valibot";

export const Registration = merge([
  object(
    {
      name: string([toTrimmed(), minLength(1)]),
      slug: string([toTrimmed(), minLength(1)]),
      authProvider: union(provider.enumValues.map((value) => literal(value))),
      providerId: string(),
      syncPapercutAccounts: fallback(
        transform(literal("true"), (value) => value === "true"),
        false,
      ),
    },
    [
      custom(({ authProvider, providerId }) => {
        if (authProvider === "entra-id")
          return safeParse(string([uuid()]), providerId).success;

        return true;
      }),
    ],
  ),
  PapercutParameter,
]);
export type Registration = Output<typeof Registration>;

export const IsOrgSlugValid = object({
  value: string(),
  isValid: boolean(),
});
export type IsOrgSlugValid = Output<typeof IsOrgSlugValid>;
