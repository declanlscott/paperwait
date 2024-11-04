import * as v from "valibot";

import {
  costSchema,
  nanoIdSchema,
  papercutAccountIdSchema,
  tenantTableSchema,
  timestampsSchema,
} from "../utils/shared";

export const papercutAccountsTableName = "papercut_accounts";
export const papercutAccountCustomerAuthorizationsTableName =
  "papercut_account_customer_authorizations";
export const papercutAccountManagerAuthorizationsTableName =
  "papercut_account_manager_authorizations";

export const papercutAccountSchema = v.object({
  id: papercutAccountIdSchema,
  tenantId: nanoIdSchema,
  name: v.string(),
  approvalThreshold: v.nullable(v.pipe(costSchema, v.transform(String))),
  ...timestampsSchema.entries,
});

export const papercutMutationNames = [
  "updatePapercutAccountApprovalThreshold",
  "deletePapercutAccount",
  "createPapercutAccountManagerAuthorization",
  "deletePapercutAccountManagerAuthorization",
] as const;

export const papercutAccountCustomerAuthorizationSchema = v.object({
  ...tenantTableSchema.entries,
  customerId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const papercutAccountManagerAuthorizationSchema = v.object({
  ...tenantTableSchema.entries,
  managerId: nanoIdSchema,
  papercutAccountId: papercutAccountIdSchema,
});

export const syncPapercutAccountsMutationArgsSchema = v.undefined_();
export type SyncPapercutAccountsMutationArgs = v.InferOutput<
  typeof syncPapercutAccountsMutationArgsSchema
>;

export const updatePapercutAccountApprovalThresholdMutationArgsSchema = v.pick(
  papercutAccountSchema,
  ["id", "approvalThreshold"],
);

export const deletePapercutAccountMutationArgsSchema = v.object({
  id: papercutAccountIdSchema,
  deletedAt: v.pipe(v.string(), v.isoTimestamp()),
});
export type DeletePapercutAccountMutationArgs = v.InferOutput<
  typeof deletePapercutAccountMutationArgsSchema
>;

export const createPapercutAccountManagerAuthorizationMutationArgsSchema =
  v.object({
    ...v.omit(papercutAccountManagerAuthorizationSchema, ["deletedAt"]).entries,
    deletedAt: v.null(),
  });
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

export const getTaskStatusResponseSchema = v.object({
  struct: v.object({
    completed: v.boolean(),
    message: v.string(),
  }),
});
export type GetTaskStatusResponse = v.InferOutput<
  typeof getTaskStatusResponseSchema
>;

export const listUserAccountsResponseSchema = v.object({
  userAccounts: v.array(v.string()),
});
export type ListUserAccountsResponse = v.InferOutput<
  typeof listUserAccountsResponseSchema
>;
