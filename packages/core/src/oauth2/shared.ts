import * as v from "valibot";

import { timestampsSchema } from "../utils/schemas";

export const oAuth2ProvidersTableName = "oauth2_providers";

export const ENTRA_ID = "entra-id";
export const GOOGLE = "google";

export const oAuth2ProviderVariants = [ENTRA_ID, GOOGLE] as const;
export type OAuth2ProviderVariant = (typeof oAuth2ProviderVariants)[number];

export const oAuth2ProvidersSchema = v.object({
  id: v.string(),
  orgId: v.string(),
  variant: v.picklist(oAuth2ProviderVariants),
  ...timestampsSchema.entries,
});

export const entraIdUserInfoSchema = v.looseObject({
  sub: v.string(),
  name: v.string(),
  picture: v.string(),
  email: v.string(),
  family_name: v.optional(v.string()),
  given_name: v.optional(v.string()),
});
export type EntraIdUserInfo = v.InferOutput<typeof entraIdUserInfoSchema>;

export const googleUserInfoSchema = v.looseObject({
  sub: v.string(),
  name: v.string(),
  picture: v.string(),
  email: v.string(),
  given_name: v.optional(v.string()),
});
export type GoogleUserInfo = v.InferOutput<typeof googleUserInfoSchema>;

export const userInfoSchema = v.union([
  entraIdUserInfoSchema,
  googleUserInfoSchema,
]);
export type UserInfo = v.InferOutput<typeof userInfoSchema>;
