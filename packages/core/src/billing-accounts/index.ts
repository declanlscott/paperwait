import { and, eq, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { useTenant } from "../actors";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { formatChannel } from "../realtime/shared";
import { Replicache } from "../replicache";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountManagerAuthorizationMutationArgsSchema,
  deleteBillingAccountMutationArgsSchema,
  updateBillingAccountReviewThresholdMutationArgsSchema,
} from "./shared";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "./sql";

import type {
  BillingAccount,
  BillingAccountCustomerAuthorization,
  BillingAccountManagerAuthorization,
} from "./sql";

export namespace BillingAccounts {
  export const createManagerAuthorization = fn(
    createBillingAccountManagerAuthorizationMutationArgsSchema,
    async (values) => {
      await AccessControl.enforce(
        [billingAccountManagerAuthorizationsTable._.name, "create"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: billingAccountManagerAuthorizationsTable._.name }],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .insert(billingAccountManagerAuthorizationsTable)
          .values(values)
          .onConflictDoNothing();

        await afterTransaction(() =>
          Replicache.poke([formatChannel("tenant", useTenant().id)]),
        );
      });
    },
  );

  export const read = async (ids: Array<BillingAccount["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(billingAccountsTable)
        .where(
          and(
            inArray(billingAccountsTable.id, ids),
            eq(billingAccountsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const readCustomerAuthorizations = async (
    ids: Array<BillingAccountCustomerAuthorization["id"]>,
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(billingAccountCustomerAuthorizationsTable)
        .where(
          and(
            inArray(billingAccountCustomerAuthorizationsTable.id, ids),
            eq(
              billingAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const readManagerAuthorizations = async (
    ids: Array<BillingAccountManagerAuthorization["id"]>,
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(billingAccountManagerAuthorizationsTable)
        .where(
          and(
            inArray(billingAccountManagerAuthorizationsTable.id, ids),
            eq(
              billingAccountManagerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const updateReviewThreshold = fn(
    updateBillingAccountReviewThresholdMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([billingAccountsTable._.name, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: billingAccountsTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(billingAccountsTable)
          .set(values)
          .where(
            and(
              eq(billingAccountsTable.id, id),
              eq(billingAccountsTable.tenantId, useTenant().id),
            ),
          );

        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          Users.withManagerAuthorization(id),
          Users.withCustomerAuthorization(id),
        ]);

        await afterTransaction(() =>
          Replicache.poke([
            ...adminsOps.map((u) => formatChannel("user", u.id)),
            ...managers.map(({ managerId }) =>
              formatChannel("user", managerId),
            ),
            ...customers.map(({ customerId }) =>
              formatChannel("user", customerId),
            ),
          ]),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteBillingAccountMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([billingAccountsTable._.name, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: billingAccountsTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          tx
            .select({
              managerId: billingAccountManagerAuthorizationsTable.managerId,
            })
            .from(billingAccountManagerAuthorizationsTable)
            .where(
              and(
                eq(
                  billingAccountManagerAuthorizationsTable.billingAccountId,
                  id,
                ),
                eq(
                  billingAccountManagerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .select({
              customerId: billingAccountCustomerAuthorizationsTable.customerId,
            })
            .from(billingAccountCustomerAuthorizationsTable)
            .where(
              and(
                eq(
                  billingAccountCustomerAuthorizationsTable.billingAccountId,
                  id,
                ),
                eq(
                  billingAccountCustomerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .update(billingAccountsTable)
            .set(values)
            .where(
              and(
                eq(billingAccountsTable.id, id),
                eq(billingAccountsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          Replicache.poke([
            ...adminsOps.map((u) => formatChannel("user", u.id)),
            ...managers.map(({ managerId }) =>
              formatChannel("user", managerId),
            ),
            ...customers.map(({ customerId }) =>
              formatChannel("user", customerId),
            ),
          ]),
        );
      });
    },
  );

  export const deleteManagerAuthorization = fn(
    deleteBillingAccountManagerAuthorizationMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce(
        [billingAccountManagerAuthorizationsTable._.name, "delete"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: billingAccountManagerAuthorizationsTable._.name, id }],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .update(billingAccountManagerAuthorizationsTable)
          .set(values)
          .where(
            and(
              eq(billingAccountManagerAuthorizationsTable.id, id),
              eq(billingAccountManagerAuthorizationsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
