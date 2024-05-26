import { merge, minLength, object, optional, string } from "valibot";

import type { Output } from "valibot";

export const baseSearchParams = object({
  redirect: optional(string()),
});

export const loginSearchParams = merge([
  baseSearchParams,
  object({ org: string([minLength(1)]) }),
]);

export const initialLoginSearchParams = { org: "" } satisfies Output<
  typeof loginSearchParams
>;
