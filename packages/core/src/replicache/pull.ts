// TODO: Finish implementing pull algorithm
import { and, eq } from "drizzle-orm";
import { parse } from "valibot";

import { ReplicacheClientGroup, ReplicacheClientViewRecord } from ".";
import { transact } from "../database";
import { UnauthorizedError } from "../errors";
import { buildCvrEntries, diffCvr } from "./cvr";
import { searchClients, searchOrders, searchUsers } from "./metadata";
import { pullRequestSchema } from "./schemas";

import type { LuciaUser } from "../auth";
import type { Cvr } from "./cvr";
import type { PullRequest } from "./schemas";

// Implements pull algorithm from Replicache docs (modified)
// https://doc.replicache.dev/strategies/row-version#pull
// Some steps are out of order due to what is included in the transaction
export async function pull(user: LuciaUser, requestBody: unknown) {
  const pull = parse(pullRequestSchema, requestBody);

  // 3: Begin transaction
  const result = await transact(async (tx) => {
    // 1: Fetch previous client view record
    const [prevCvr] = pull.cookie
      ? await tx
          .select({ data: ReplicacheClientViewRecord.data })
          .from(ReplicacheClientViewRecord)
          .where(
            and(
              eq(ReplicacheClientViewRecord.clientGroupId, pull.clientGroupId),
              eq(ReplicacheClientViewRecord.id, pull.cookie.order),
            ),
          )
      : [undefined];

    // 2: Initialize base client view record
    const baseCvr = prevCvr ?? {};

    // 4: Get client group (insert into db if it doesn't exist)
    const [group] = await tx
      .insert(ReplicacheClientGroup)
      .values({
        id: pull.clientGroupId,
        userId: user.id,
        cvrVersion: 0,
      })
      .onConflictDoNothing({ target: ReplicacheClientGroup.id })
      .returning({
        id: ReplicacheClientGroup.id,
        cvrVersion: ReplicacheClientGroup.cvrVersion,
        userId: ReplicacheClientGroup.userId,
      });

    // 5: Verify requesting client group owns requested client
    if (group.userId !== user.id) {
      throw new UnauthorizedError("User does not own client group");
    }

    // 6: Read all domain data, just ids and versions
    // 7: Read all clients in the client group
    const [users, orders, clients] = await Promise.all([
      searchUsers(tx, user),
      searchOrders(tx, user),
      searchClients(tx, group.id),
    ]);

    // 8: Build next client view record
    const nextCvr = {
      user: buildCvrEntries(users),
      order: buildCvrEntries(orders),
      client: buildCvrEntries(clients),
    } satisfies Cvr;

    // 9: Calculate diffs
    const diff = diffCvr(baseCvr, nextCvr);

    // 10: If diff is empty, return no-op

    // 11: Get entities

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.

    // 13: new client view record version

    // 14: Write client group record

    // 16: Generate client view record id

    // 17: Store client view record

    // 15: Commit transaction
  });

  // 10: If transaction result returns no differences, return no-op

  // 18(i): Build patch

  // 18(ii): Construct cookie
  const cookie = {
    order: 0,
    cvrId: "",
  } satisfies NonNullable<PullRequest["cookie"]>;

  // 18(iii): Last mutation ID changes

  return { cookie };
}
