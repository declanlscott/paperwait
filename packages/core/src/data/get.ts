import { and, eq, inArray } from "drizzle-orm";
import * as R from "remeda";

import { useAuthenticated } from "../auth";
import { ForbiddenError } from "../errors/http";
import { Order } from "../order/order.sql";
import { useTransaction } from "../orm/transaction";
import {
  PapercutAccount,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { ReplicacheClientGroup } from "../replicache/replicache.sql";
import { User } from "../user/user.sql";

import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ClientGroupID } from "replicache";
import type { OmitTimestamps } from "../types/drizzle";
import type { UserRole } from "../user/user.sql";

export const getClientGroup = (id: ClientGroupID) =>
  useTransaction((tx) => {
    const { org, user } = useAuthenticated();

    return tx
      .select({
        id: ReplicacheClientGroup.id,
        orgId: ReplicacheClientGroup.orgId,
        cvrVersion: ReplicacheClientGroup.cvrVersion,
        userId: ReplicacheClientGroup.userId,
      })
      .from(ReplicacheClientGroup)
      .where(
        and(
          eq(ReplicacheClientGroup.id, id),
          eq(ReplicacheClientGroup.orgId, org.id),
        ),
      )
      .execute()
      .then(
        (rows) =>
          rows.at(0) ??
          ({
            id,
            orgId: org.id,
            userId: user.id,
            cvrVersion: 0,
          } satisfies OmitTimestamps<ReplicacheClientGroup>),
      );
  });

export const getData = async <
  TTable extends PgTable,
  TOrgIdColumn extends PgColumn,
  TIdColumn extends PgColumn,
>(
  Table: TTable,
  column: {
    id: TIdColumn;
    orgId: TOrgIdColumn;
  },
  ids: Array<unknown>,
) =>
  await useTransaction((tx) => {
    if (!ids.length) return [];

    const { org } = useAuthenticated();

    return tx
      .select()
      .from(Table)
      .where(and(inArray(column.id, ids), eq(column.orgId, org.id)));
  });

export const getUsersByRoles = async (
  roles: Array<UserRole> = ["administrator", "operator", "manager", "customer"],
) =>
  useTransaction((tx) => {
    const { org } = useAuthenticated();

    return tx
      .select({ id: User.id, role: User.role })
      .from(User)
      .where(and(inArray(User.role, roles), eq(User.orgId, org.id)));
  });

export async function requireAccessToOrder(orderId: Order["id"]) {
  const { user } = useAuthenticated();

  const users = await getUsersWithAccessToOrder(orderId);

  if (!users.map(({ id }) => id).includes(user.id))
    throw new ForbiddenError(
      `User "${user.id}" does not have access to order "${orderId}"`,
    );

  return users;
}

export const getUsersWithAccessToOrder = async (orderId: Order["id"]) =>
  useTransaction(async (tx) => {
    const { org } = useAuthenticated();

    const [adminsOps, managers, [customer]] = await Promise.all([
      getUsersByRoles(["administrator", "operator"]),
      tx
        .select({ id: User.id })
        .from(User)
        .innerJoin(
          PapercutAccountManagerAuthorization,
          and(
            eq(User.id, PapercutAccountManagerAuthorization.managerId),
            eq(User.orgId, PapercutAccountManagerAuthorization.orgId),
          ),
        )
        .innerJoin(
          Order,
          and(
            eq(
              PapercutAccountManagerAuthorization.papercutAccountId,
              Order.papercutAccountId,
            ),
            eq(PapercutAccount.orgId, Order.orgId),
          ),
        )
        .where(and(eq(Order.id, orderId), eq(Order.orgId, org.id))),
      tx
        .select({ id: User.id })
        .from(User)
        .innerJoin(Order, eq(User.id, Order.customerId))
        .where(and(eq(Order.id, orderId), eq(Order.orgId, org.id))),
    ]);

    return R.uniqueBy([...adminsOps, ...managers, customer], ({ id }) => id);
  });
