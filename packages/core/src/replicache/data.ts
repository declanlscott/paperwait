import { and, eq, inArray } from "drizzle-orm";

import { ReplicacheClientGroup } from "./replicache.sql";

import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ClientGroupID } from "replicache";
import type { LuciaUser } from "../auth/lucia";
import type { Transaction } from "../database/transaction";
import type { OmitTimestamps } from "../types/drizzle";

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

export async function getData<TTable extends PgTable, TColumn extends PgColumn>(
  tx: Transaction,
  table: TTable,
  column: TColumn,
  array: unknown[],
) {
  if (!array.length) return [];

  return tx.select().from(table).where(inArray(column, array));
}
