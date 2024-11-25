import { and, eq, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { useTenant } from "../actors";
import { afterTransaction, useTransaction } from "../drizzle/transaction";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { TenantApi } from "../tenants/api";
import { Users } from "../users";
import { Constants } from "../utils/constants";
import { ApplicationError, HttpError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createPapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountManagerAuthorizationMutationArgsSchema,
  deletePapercutAccountMutationArgsSchema,
  updatePapercutAccountApprovalThresholdMutationArgsSchema,
} from "./shared";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "./sql";

import type {
  PapercutAccount,
  PapercutAccountCustomerAuthorization,
  PapercutAccountManagerAuthorization,
} from "./sql";

export namespace Papercut {
  export async function getAuthToken() {
    const res = await TenantApi.send(
      `/papercut${Constants.PAPERCUT_SERVER_AUTH_TOKEN_PARAMETER_NAME}`,
      { method: "GET", headers: { "X-With-Decryption": "true" } },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return res.text();
  }

  export const createAccountManagerAuthorization = fn(
    createPapercutAccountManagerAuthorizationMutationArgsSchema,
    async (values) => {
      await AccessControl.enforce(
        [papercutAccountManagerAuthorizationsTable._.name, "create"],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: papercutAccountManagerAuthorizationsTable._.name }],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .insert(papercutAccountManagerAuthorizationsTable)
          .values(values)
          .onConflictDoNothing();

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", useTenant().id)]),
        );
      });
    },
  );

  export const readAccounts = async (ids: Array<PapercutAccount["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(papercutAccountsTable)
        .where(
          and(
            inArray(papercutAccountsTable.id, ids),
            eq(papercutAccountsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const readAccountCustomerAuthorizations = async (
    ids: Array<PapercutAccountCustomerAuthorization["id"]>,
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(papercutAccountCustomerAuthorizationsTable)
        .where(
          and(
            inArray(papercutAccountCustomerAuthorizationsTable.id, ids),
            eq(
              papercutAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const readAccountManagerAuthorizations = async (
    ids: Array<PapercutAccountManagerAuthorization["id"]>,
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(papercutAccountManagerAuthorizationsTable)
        .where(
          and(
            inArray(papercutAccountManagerAuthorizationsTable.id, ids),
            eq(
              papercutAccountManagerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const updateAccountApprovalThreshold = fn(
    updatePapercutAccountApprovalThresholdMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(
        [papercutAccountsTable._.name, "update", id],
        {
          Error: ApplicationError.AccessDenied,
          args: [{ name: papercutAccountsTable._.name, id }],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .update(papercutAccountsTable)
          .set(values)
          .where(
            and(
              eq(papercutAccountsTable.id, id),
              eq(papercutAccountsTable.tenantId, useTenant().id),
            ),
          );

        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          Users.withManagerAuthorization(id),
          Users.withCustomerAuthorization(id),
        ]);

        await afterTransaction(() =>
          Replicache.poke([
            ...adminsOps.map((u) => Realtime.formatChannel("user", u.id)),
            ...managers.map(({ managerId }) =>
              Realtime.formatChannel("user", managerId),
            ),
            ...customers.map(({ customerId }) =>
              Realtime.formatChannel("user", customerId),
            ),
          ]),
        );
      });
    },
  );

  export const deleteAccount = fn(
    deletePapercutAccountMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([papercutAccountsTable._.name, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: papercutAccountsTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        const [adminsOps, managers, customers] = await Promise.all([
          Users.fromRoles(["administrator", "operator"]),
          tx
            .select({
              managerId: papercutAccountManagerAuthorizationsTable.managerId,
            })
            .from(papercutAccountManagerAuthorizationsTable)
            .where(
              and(
                eq(
                  papercutAccountManagerAuthorizationsTable.papercutAccountId,
                  id,
                ),
                eq(
                  papercutAccountManagerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .select({
              customerId: papercutAccountCustomerAuthorizationsTable.customerId,
            })
            .from(papercutAccountCustomerAuthorizationsTable)
            .where(
              and(
                eq(
                  papercutAccountCustomerAuthorizationsTable.papercutAccountId,
                  id,
                ),
                eq(
                  papercutAccountCustomerAuthorizationsTable.tenantId,
                  tenant.id,
                ),
              ),
            ),
          tx
            .update(papercutAccountsTable)
            .set(values)
            .where(
              and(
                eq(papercutAccountsTable.id, id),
                eq(papercutAccountsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          Replicache.poke([
            ...adminsOps.map((u) => Realtime.formatChannel("user", u.id)),
            ...managers.map(({ managerId }) =>
              Realtime.formatChannel("user", managerId),
            ),
            ...customers.map(({ customerId }) =>
              Realtime.formatChannel("user", customerId),
            ),
          ]),
        );
      });
    },
  );

  export const deleteAccountManagerAuthorization = fn(
    deletePapercutAccountManagerAuthorizationMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce(
        [papercutAccountManagerAuthorizationsTable._.name, "delete"],
        {
          Error: ApplicationError.AccessDenied,
          args: [
            { name: papercutAccountManagerAuthorizationsTable._.name, id },
          ],
        },
      );

      return useTransaction(async (tx) => {
        await tx
          .update(papercutAccountManagerAuthorizationsTable)
          .set(values)
          .where(
            and(
              eq(papercutAccountManagerAuthorizationsTable.id, id),
              eq(papercutAccountManagerAuthorizationsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
