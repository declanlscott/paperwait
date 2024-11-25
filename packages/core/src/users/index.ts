import { and, eq, inArray, sql } from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { useTenant } from "../actors";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import {
  afterTransaction,
  serializable,
  useTransaction,
} from "../drizzle/transaction";
import { ordersTable } from "../orders/sql";
import { PapercutRpc } from "../papercut/rpc";
import {
  papercutAccountCustomerAuthorizationsTable,
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { Sessions } from "../sessions";
import { ApplicationError, HttpError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
} from "./shared";
import { userProfilesTable, usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Order } from "../orders/sql";
import type { PapercutAccount } from "../papercut/sql";
import type { UserRole } from "./shared";
import type { User, UserProfilesTable } from "./sql";

export namespace Users {
  export async function sync() {
    const tenant = useTenant();

    // Avoid syncing with papercut if papercut itself is still syncing
    const taskStatus = await PapercutRpc.getTaskStatus();
    if (!taskStatus.completed)
      throw new HttpError.ServiceUnavailable(taskStatus.message);

    const next = new Set(await PapercutRpc.listUserAccounts());

    await serializable(async (tx) => {
      const prev = await tx
        .select({
          username: usersTable.username,
        })
        .from(usersTable)
        .where(eq(usersTable.tenantId, tenant.id))
        .then((rows) => new Set(R.map(rows, R.prop("username"))));

      const puts: Array<User["username"]> = [];
      const dels: Array<User["username"]> = [];

      for (const username of next) if (!prev.has(username)) puts.push(username);
      for (const username of prev) if (!next.has(username)) dels.push(username);

      await tx
        .insert(usersTable)
        .values([
          ...puts.map((username) => ({
            username,
            tenantId: tenant.id,
            deletedAt: null,
          })),
          ...dels.map((username) => ({
            username,
            tenantId: tenant.id,
            deletedAt: sql`now()`,
          })),
        ])
        .onConflictDoUpdate({
          target: [usersTable.username, usersTable.tenantId],
          set: buildConflictUpdateColumns(usersTable, [
            "username",
            "tenantId",
            "deletedAt",
          ]),
        });
    });
  }

  export const createProfile = async (
    profile: InferInsertModel<UserProfilesTable>,
  ) =>
    useTransaction(async (tx) =>
      tx
        .insert(userProfilesTable)
        .values(profile)
        .returning({ id: userProfilesTable.id })
        .then((rows) => rows.at(0)),
    );

  export const read = async (ids: Array<User["id"]>) =>
    useTransaction((tx) =>
      tx
        .select({
          user: usersTable,
          profile: userProfilesTable,
        })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(
            inArray(usersTable.id, ids),
            eq(usersTable.tenantId, useTenant().id),
          ),
        )
        .then((rows) =>
          rows.map(({ user, profile }) => ({ ...user, profile })),
        ),
    );

  export const fromRoles = async (
    roles: Array<UserRole> = [
      "administrator",
      "operator",
      "manager",
      "customer",
    ],
  ) =>
    useTransaction((tx) =>
      tx
        .select({ id: usersTable.id, role: userProfilesTable.role })
        .from(usersTable)
        .innerJoin(
          userProfilesTable,
          and(
            eq(usersTable.id, userProfilesTable.userId),
            eq(usersTable.tenantId, userProfilesTable.tenantId),
          ),
        )
        .where(
          and(
            inArray(userProfilesTable.role, roles),
            eq(usersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export async function withOrderAccess(orderId: Order["id"]) {
    const tenant = useTenant();

    return useTransaction(async (tx) => {
      const [adminsOps, managers, [customer]] = await Promise.all([
        fromRoles(["administrator", "operator"]),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            userProfilesTable,
            and(
              eq(usersTable.id, userProfilesTable.userId),
              eq(usersTable.tenantId, userProfilesTable.tenantId),
            ),
          )
          .innerJoin(
            papercutAccountManagerAuthorizationsTable,
            and(
              eq(
                usersTable.id,
                papercutAccountManagerAuthorizationsTable.managerId,
              ),
              eq(
                usersTable.tenantId,
                papercutAccountManagerAuthorizationsTable.tenantId,
              ),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(
                papercutAccountManagerAuthorizationsTable.papercutAccountId,
                ordersTable.papercutAccountId,
              ),
              eq(papercutAccountsTable.tenantId, tenant.id),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            userProfilesTable,
            and(
              eq(usersTable.id, userProfilesTable.userId),
              eq(usersTable.tenantId, userProfilesTable.tenantId),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(usersTable.id, ordersTable.customerId),
              eq(usersTable.tenantId, ordersTable.tenantId),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
      ]);

      return R.uniqueBy([...adminsOps, ...managers, customer], R.prop("id"));
    });
  }

  export const withManagerAuthorization = async (
    accountId: PapercutAccount["id"],
  ) =>
    useTransaction(async (tx) =>
      tx
        .select({
          managerId: papercutAccountManagerAuthorizationsTable.managerId,
        })
        .from(papercutAccountManagerAuthorizationsTable)
        .where(
          and(
            eq(
              papercutAccountManagerAuthorizationsTable.papercutAccountId,
              accountId,
            ),
            eq(
              papercutAccountManagerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const withCustomerAuthorization = async (
    accountId: PapercutAccount["id"],
  ) =>
    useTransaction((tx) =>
      tx
        .select({
          customerId: papercutAccountCustomerAuthorizationsTable.customerId,
        })
        .from(papercutAccountCustomerAuthorizationsTable)
        .where(
          and(
            eq(
              papercutAccountCustomerAuthorizationsTable.papercutAccountId,
              accountId,
            ),
            eq(
              papercutAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const exists = async (userId: User["id"]) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, userId),
            eq(usersTable.tenantId, useTenant().id),
          ),
        )
        .then((rows) => rows.length > 0),
    );

  export const updateProfileRole = fn(
    updateUserProfileRoleMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([usersTable._.name, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(userProfilesTable)
          .set(values)
          .where(
            and(
              eq(userProfilesTable.id, id),
              eq(userProfilesTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );

  export const deleteProfile = fn(
    deleteUserProfileMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([usersTable._.name, "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set(values)
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)),
          );

        await afterTransaction(() =>
          Promise.all([
            Sessions.invalidateUser(id),
            Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
          ]),
        );
      });
    },
  );

  export const restoreProfile = fn(
    restoreUserProfileMutationArgsSchema,
    async ({ id }) => {
      const tenant = useTenant();

      await AccessControl.enforce([usersTable._.name, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: usersTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ deletedAt: null })
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, tenant.id)),
          );

        await afterTransaction(() =>
          Replicache.poke([Realtime.formatChannel("tenant", tenant.id)]),
        );
      });
    },
  );
}
