import { valibot as v } from "@paperwait/core/utils/libs";

export const BaseSearchParams = v.object({
  redirect: v.optional(v.string()),
});
export type BaseSearchParams = v.InferOutput<typeof BaseSearchParams>;

export const LoginSearchParams = v.object({
  ...BaseSearchParams.entries,
  ...v.object({
    tenant: v.pipe(v.string(), v.minLength(1)),
  }).entries,
});
export type LoginSearchParams = v.InferOutput<typeof LoginSearchParams>;

export const initialLoginSearchParams = {
  tenant: "",
} satisfies LoginSearchParams;
