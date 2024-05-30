import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  CustomerToSharedAccount,
  ManagerToSharedAccount,
} from "../database/relations.sql";
import { ForbiddenError } from "../errors/http";
import { SharedAccount } from "../shared-account";
import { User } from "../user/user.sql";
import { ReplicacheClientGroup } from "./replicache.sql";

import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ClientGroupID } from "replicache";
import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { Order } from "../order/order.sql";
import type { Organization } from "../organization";
import type { OmitTimestamps } from "../types/drizzle";
import type { UserRole } from "../user/user.sql";

export async function getClientGroup(
  tx: Transaction,
  user: LuciaUser,
  id: ClientGroupID,
): Promise<OmitTimestamps<ReplicacheClientGroup>> {
  return (
    (await tx
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
      .then((rows) => rows.at(0))) ??
    ({
      id,
      orgId: user.orgId,
      userId: user.id,
      cvrVersion: 0,
    } satisfies OmitTimestamps<ReplicacheClientGroup>)
  );
}

export async function getData<
  TTable extends PgTable,
  TOrgIdColumn extends PgColumn,
  TIdColumn extends PgColumn,
  TDeletedAtColumn extends PgColumn,
>(
  tx: Transaction,
  table: TTable,
  column: {
    orgId: TOrgIdColumn;
    id: TIdColumn;
    deletedAt?: TDeletedAtColumn;
  },
  data: { orgId: Organization["id"]; ids: unknown[] },
) {
  if (!data.ids.length) return [];

  if (!column.deletedAt)
    return tx
      .select()
      .from(table)
      .where(and(inArray(column.id, data.ids), eq(column.orgId, data.orgId)));

  return tx
    .select()
    .from(table)
    .where(
      and(
        inArray(column.id, data.ids),
        eq(column.orgId, data.orgId),
        isNull(column.deletedAt),
      ),
    );
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

export async function getUsersBySharedAccounts(
  tx: Transaction,
  orgId: Organization["id"],
  sharedAccountIds: Array<SharedAccount["id"]>,
) {
  if (!sharedAccountIds.length) return [];

  const [customerIds, managerIds] = await Promise.all([
    tx
      .select({ id: User.id })
      .from(CustomerToSharedAccount)
      .leftJoin(
        User,
        and(
          eq(CustomerToSharedAccount.customerId, User.id),
          eq(CustomerToSharedAccount.orgId, User.orgId),
        ),
      )
      .where(
        and(
          inArray(CustomerToSharedAccount.sharedAccountId, sharedAccountIds),
          eq(SharedAccount.orgId, orgId),
        ),
      ),
    tx
      .select({ id: User.id })
      .from(ManagerToSharedAccount)
      .leftJoin(
        User,
        and(
          eq(ManagerToSharedAccount.managerId, User.id),
          eq(ManagerToSharedAccount.orgId, User.orgId),
        ),
      )
      .where(
        and(
          inArray(ManagerToSharedAccount.sharedAccountId, sharedAccountIds),
          eq(SharedAccount.orgId, orgId),
        ),
      ),
  ]);

  return [...customerIds, ...managerIds].filter(
    (row): row is Pick<User, "id"> => row.id !== null,
  );
}

// TODO: Implement this function
export async function requireAccessToOrder(
  tx: Transaction,
  userId: User["id"],
  orderId: Order["id"],
) {
  throw new ForbiddenError("User does not have access to this order");
}
