import * as v from "valibot";

import { nanoIdSchema, tenantTableSchema } from "../utils/schemas";

export const usersTableName = "users";

export const userRoles = [
  "administrator",
  "operator",
  "manager",
  "customer",
] as const;
export type UserRole = (typeof userRoles)[number];

export const userSchema = v.object({
  ...tenantTableSchema.entries,
  providerId: v.string(),
  role: v.picklist(userRoles),
  name: v.string(),
  email: v.string(),
  username: v.string(),
});

export const userProfileMutationNames = [
  "updateUserProfileRole",
  "deleteUserProfile",
  "restoreUserProfile",
] as const;

export const updateUserProfileRoleMutationArgsSchema = v.object({
  id: nanoIdSchema,
  role: v.picklist(userRoles),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type UpdateUserRoleMutationArgs = v.InferOutput<
  typeof updateUserProfileRoleMutationArgsSchema
>;

export const deleteUserProfileMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteUserProfileMutationArgs = v.InferOutput<
  typeof deleteUserProfileMutationArgsSchema
>;

export const restoreUserProfileMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreUserProfileMutationArgs = v.InferOutput<
  typeof restoreUserProfileMutationArgsSchema
>;

export const userProfilesTableName = "user_profiles";
