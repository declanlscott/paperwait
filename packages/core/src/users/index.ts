import { addMinutes } from "date-fns";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { buildConflictUpdateColumns } from "../drizzle/columns";
import {
  afterTransaction,
  serializable,
  useTransaction,
} from "../drizzle/transaction";
import { ordersTable } from "../orders/sql";
import {
  papercutAccountManagerAuthorizationsTable,
  papercutAccountsTable,
} from "../papercut/sql";
import { Realtime } from "../realtime";
import { Replicache } from "../replicache";
import { mutationRbac } from "../replicache/shared";
import { Sessions } from "../sessions";
import { useAuthenticated } from "../sessions/context";
import { Cloudfront } from "../utils/aws";
import { Constants } from "../utils/constants";
import {
  ApplicationError,
  HttpError,
  MiscellaneousError,
} from "../utils/errors";
import { enforceRbac, fn, rbacErrorMessage } from "../utils/shared";
import {
  deleteUserProfileMutationArgsSchema,
  restoreUserProfileMutationArgsSchema,
  updateUserProfileRoleMutationArgsSchema,
  userSyncResponseSchema,
} from "./shared";
import { userProfilesTable, usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Order } from "../orders/sql";
import type { Tenant } from "../tenants/sql";
import type { UserRole } from "./shared";
import type { User, UserProfilesTable } from "./sql";

export namespace Users {
  export async function sync(tenantId: Tenant["id"]) {
    const tenantFqdn = `${tenantId}.${Resource.AppData.domainName.fullyQualified}`;

    const signedUrl = Cloudfront.getSignedUrl({
      keyPairId: await Cloudfront.getKeyPairId(tenantFqdn),
      privateKey: Resource.CloudfrontPrivateKeyPem.value,
      url: Cloudfront.buildUrl(tenantFqdn, [
        "api",
        "papercut",
        "secure-bridge",
        "listUserAccounts",
      ]),
      dateLessThan: addMinutes(Date.now(), 15).toISOString(),
    });

    const next = new Set<string>();
    const limit = Constants.PAPERCUT_API_PAGINATION_LIMIT;
    let offset = 0;
    let hasMore: boolean;
    do {
      const res = await fetch(signedUrl, {
        method: "POST",
        body: JSON.stringify({ offset, limit }),
      });
      if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

      const usernames = v.parse(
        userSyncResponseSchema,
        await res.json(),
      ).userAccounts;

      usernames.forEach((username) => next.add(username));

      offset += limit;
      hasMore = usernames.length === limit;
    } while (hasMore);

    await serializable(async (tx) => {
      const prev = await tx
        .select({
          username: usersTable.username,
        })
        .from(usersTable)
        .where(eq(usersTable.tenantId, tenantId))
        .then((rows) => new Set(rows.map(({ username }) => username)));

      const puts: Array<User["username"]> = [];
      const dels: Array<User["username"]> = [];

      for (const username of next) if (!prev.has(username)) puts.push(username);
      for (const username of prev) if (!next.has(username)) dels.push(username);

      await tx
        .insert(usersTable)
        .values([
          ...puts.map((username) => ({
            username,
            tenantId,
            deletedAt: null,
          })),
          ...dels.map((username) => ({
            username,
            tenantId,
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

  export async function metadata() {
    const { user, tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const baseQuery = tx
        .select({
          id: usersTable.id,
          rowVersion: sql<number>`"${userProfilesTable._.name}"."${Constants.ROW_VERSION_COLUMN_NAME}"`,
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
          and(eq(usersTable.tenantId, tenant.id), isNull(usersTable.deletedAt)),
        )
        .$dynamic();

      switch (user.profile.role) {
        case "administrator":
          return baseQuery;
        case "operator":
          return baseQuery.where(isNull(userProfilesTable.deletedAt));
        case "manager":
          return baseQuery.where(isNull(userProfilesTable.deletedAt));
        case "customer":
          return baseQuery.where(isNull(userProfilesTable.deletedAt));
        default:
          throw new MiscellaneousError.NonExhaustiveValue(user.profile.role);
      }
    });
  }

  export async function fromIds(ids: Array<User["id"]>) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
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
          and(inArray(usersTable.id, ids), eq(usersTable.tenantId, tenant.id)),
        )
        .then((rows) =>
          rows.map(({ user, profile }) => ({ ...user, profile })),
        ),
    );
  }

  export async function fromRoles(
    roles: Array<UserRole> = [
      "administrator",
      "operator",
      "manager",
      "customer",
    ],
  ) {
    const { tenant } = useAuthenticated();

    return useTransaction((tx) =>
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
            eq(usersTable.tenantId, tenant.id),
          ),
        ),
    );
  }

  export async function withOrderAccess(orderId: Order["id"]) {
    const { tenant } = useAuthenticated();

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

      return R.uniqueBy([...adminsOps, ...managers, customer], ({ id }) => id);
    });
  }

  export async function exists(userId: User["id"]) {
    const { tenant } = useAuthenticated();

    return useTransaction(async (tx) => {
      const rows = await tx
        .select()
        .from(usersTable)
        .where(
          and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenant.id)),
        );

      return rows.length > 0;
    });
  }

  export const updateProfileRole = fn(
    updateUserProfileRoleMutationArgsSchema,
    async ({ id, ...values }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.updateUserProfileRole, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "update user profile role mutator")],
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
      const { user, tenant } = useAuthenticated();

      if (
        id === user.id ||
        enforceRbac(user, mutationRbac.deleteUserProfile, {
          Error: ApplicationError.AccessDenied,
          args: [rbacErrorMessage(user, "delete user profile mutator")],
        })
      ) {
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
      }
    },
  );

  export const restoreProfile = fn(
    restoreUserProfileMutationArgsSchema,
    async ({ id }) => {
      const { user, tenant } = useAuthenticated();

      enforceRbac(user, mutationRbac.restoreUserProfile, {
        Error: ApplicationError.AccessDenied,
        args: [rbacErrorMessage(user, "restore user profile mutator")],
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
