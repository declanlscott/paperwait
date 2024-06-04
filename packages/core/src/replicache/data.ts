import { and, eq, inArray } from "drizzle-orm";
import { uniqueBy } from "remeda";

import { OrderAccessDeniedError } from "../errors/application";
import { Order } from "../order/order.sql";
import {
  PapercutAccount,
  PapercutAccountManagerAuthorization,
} from "../papercut/account.sql";
import { User } from "../user/user.sql";
import { ReplicacheClientGroup } from "./replicache.sql";

import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ClientGroupID } from "replicache";
import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { Organization } from "../organization";
import type { OmitTimestamps } from "../types/drizzle";
import type { UserRole } from "../user/user.sql";

export async function getClientGroup(
  tx: Transaction,
  user: LuciaUser,
  id: ClientGroupID,
) {
  return await tx
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
        eq(ReplicacheClientGroup.orgId, user.orgId),
      ),
    )
    .execute()
    .then(
      (rows) =>
        rows.at(0) ??
        ({
          id,
          orgId: user.orgId,
          userId: user.id,
          cvrVersion: 0,
        } satisfies OmitTimestamps<ReplicacheClientGroup>),
    );
}

export async function getData<
  TTable extends PgTable,
  TOrgIdColumn extends PgColumn,
  TIdColumn extends PgColumn,
>(
  tx: Transaction,
  Table: TTable,
  column: {
    id: TIdColumn;
    orgId: TOrgIdColumn;
  },
  data: { orgId: Organization["id"]; ids: unknown[] },
) {
  if (!data.ids.length) return [];

  return tx
    .select()
    .from(Table)
    .where(and(inArray(column.id, data.ids), eq(column.orgId, data.orgId)));
}

export async function getUsersByRoles(
  tx: Transaction,
  orgId: Organization["id"],
  roles: Array<UserRole>,
) {
  return tx
    .select({ id: User.id })
    .from(User)
    .where(and(inArray(User.role, roles), eq(User.orgId, orgId)));
}

export async function requireAccessToOrder(
  tx: Transaction,
  user: LuciaUser,
  orderId: Order["id"],
) {
  const users = await getUsersWithAccessToOrder(tx, orderId, user.orgId);

  if (!users.map(({ id }) => id).includes(user.id))
    throw new OrderAccessDeniedError({ orderId, userId: user.id });

  return users;
}

export async function getUsersWithAccessToOrder(
  tx: Transaction,
  orderId: Order["id"],
  orgId: Order["orgId"],
) {
  const [adminsOps, managers, [customer]] = await Promise.all([
    getUsersByRoles(tx, orgId, ["administrator", "operator"]),
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
      .where(and(eq(Order.id, orderId), eq(Order.orgId, orgId))),
    tx
      .select({ id: User.id })
      .from(User)
      .innerJoin(Order, eq(User.id, Order.customerId))
      .where(and(eq(Order.id, orderId), eq(Order.orgId, orgId))),
  ]);

  return uniqueBy([...adminsOps, ...managers, customer], ({ id }) => id);
}
