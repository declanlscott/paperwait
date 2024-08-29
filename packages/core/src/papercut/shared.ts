import * as v from "valibot";

import {
  nanoIdSchema,
  orgTableSchema,
  papercutAccountIdSchema,
  timestampsSchema,
} from "../utils/schemas";

export const papercutAccountsTableName = "papercut_accounts";
export const papercutAccountCustomerAuthorizationsTableName =
  "papercut_account_customer_authorizations";
export const papercutAccountManagerAuthorizationsTableName =
  "papercut_account_manager_authorizations";

export const papercutAccountSchema = v.object({
  id: papercutAccountIdSchema,
  orgId: nanoIdSchema,
  name: v.string(),
  ...timestampsSchema.entries,
});

export const papercutMutationNames = [
  "deletePapercutAccount",
  "createPapercutAccountManagerAuthorization",
  "deletePapercutAccountManagerAuthorization",
] as const;

export const papercutAccountCustomerAuthorizationSchema = v.object({
  ...orgTableSchema.entries,
  customerId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const papercutAccountManagerAuthorizationSchema = v.object({
  ...orgTableSchema.entries,
  managerId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const syncPapercutAccountsMutationArgsSchema = v.undefined_();
export type SyncPapercutAccountsMutationArgs = v.InferOutput<
  typeof syncPapercutAccountsMutationArgsSchema
>;

export const deletePapercutAccountMutationArgsSchema = v.object({
  id: papercutAccountIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeletePapercutAccountMutationArgs = v.InferOutput<
  typeof deletePapercutAccountMutationArgsSchema
>;

export const createPapercutAccountManagerAuthorizationMutationArgsSchema =
  papercutAccountManagerAuthorizationSchema;
export type CreatePapercutAccountManagerAuthorizationMutationArgs =
  v.InferOutput<
    typeof createPapercutAccountManagerAuthorizationMutationArgsSchema
  >;

export const deletePapercutAccountManagerAuthorizationMutationArgsSchema =
  v.object({
    id: nanoIdSchema,
    deletedAt: v.pipe(v.string(), v.isoTimestamp()),
  });
export type DeletePapercutAccountManagerAuthorizationMutationArgs =
  v.InferOutput<
    typeof deletePapercutAccountManagerAuthorizationMutationArgsSchema
  >;
