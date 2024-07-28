import * as v from "valibot";

export const EntraIdUserInfo = v.looseObject({
  sub: v.string(),
  name: v.string(),
  family_name: v.string(),
  given_name: v.string(),
  picture: v.string(),
  email: v.string(),
});
export type EntraIdUserInfo = v.InferOutput<typeof EntraIdUserInfo>;

export const GoogleUserInfo = v.looseObject({
  sub: v.string(),
  name: v.string(),
  given_name: v.string(),
  picture: v.string(),
  email: v.string(),
});
export type GoogleUserInfo = v.InferOutput<typeof GoogleUserInfo>;

export const UserInfo = v.union([EntraIdUserInfo, GoogleUserInfo]);
export type UserInfo = v.InferOutput<typeof UserInfo>;
