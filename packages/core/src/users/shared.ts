import * as v from "valibot";

import { nanoIdSchema, orgTableSchema } from "../utils/schemas";

export const usersTableName = "users";

export const userRoles = [
  "administrator",
  "operator",
  "manager",
  "customer",
] as const;
export type UserRole = (typeof userRoles)[number];

export const userSchema = v.object({
  ...orgTableSchema.entries,
  providerId: v.string(),
  role: v.picklist(userRoles),
  name: v.string(),
  email: v.string(),
  username: v.string(),
});

export const userMutationNames = [
  "updateUserRole",
  "deleteUser",
  "restoreUser",
] as const;

export const updateUserRoleMutationArgsSchema = v.object({
  id: nanoIdSchema,
  role: v.picklist(userRoles),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type UpdateUserRoleMutationArgs = v.InferOutput<
  typeof updateUserRoleMutationArgsSchema
>;

export const deleteUserMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeleteUserMutationArgs = v.InferOutput<
  typeof deleteUserMutationArgsSchema
>;

export const restoreUserMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreUserMutationArgs = v.InferOutput<
  typeof restoreUserMutationArgsSchema
>;
