import * as v from "@paperwait/core/libs/valibot";

export const baseSearchParamsSchema = v.object({
  redirect: v.optional(v.string()),
});
export type BaseSearchParams = v.InferOutput<typeof baseSearchParamsSchema>;

export const loginSearchParamsSchema = v.object({
  ...baseSearchParamsSchema.entries,
  ...v.object({
    tenant: v.pipe(v.string(), v.minLength(1)),
  }).entries,
});
export type LoginSearchParams = v.InferOutput<typeof loginSearchParamsSchema>;

export const initialLoginSearchParams = {
  tenant: "",
} satisfies LoginSearchParams;
