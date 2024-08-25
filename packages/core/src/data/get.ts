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
