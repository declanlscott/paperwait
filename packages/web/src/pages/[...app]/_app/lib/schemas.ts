import * as v from "valibot";

export const BaseSearchParams = v.object({
  redirect: v.optional(v.string()),
});
export type BaseSearchParams = v.InferOutput<typeof BaseSearchParams>;

export const LoginSearchParams = v.object({
  ...BaseSearchParams.entries,
  ...v.object({
    org: v.pipe(v.string(), v.minLength(1)),
  }).entries,
});
export type LoginSearchParams = v.InferOutput<typeof LoginSearchParams>;

export const initialLoginSearchParams = { org: "" } satisfies LoginSearchParams;
