import * as v from "valibot";

export const baseSearchParams = v.object({
  redirect: v.optional(v.string()),
});

export const loginSearchParams = v.object({
  ...baseSearchParams.entries,
  ...v.object({
    org: v.pipe(v.string(), v.minLength(1)),
  }).entries,
});

export const initialLoginSearchParams = { org: "" } satisfies v.InferOutput<
  typeof loginSearchParams
>;
