import { and, eq, inArray, sql } from "drizzle-orm";
import { parse } from "valibot";

import { ReplicacheClientGroup, ReplicacheClientView } from ".";
import { transact } from "../database";
import { UnauthorizedError } from "../errors";
import { Order } from "../order";
import { User } from "../user";
import { serializeEntity } from "../utils";
import { buildCvrEntries, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import { searchClients, searchOrders, searchUsers } from "./metadata";
import { pullRequestSchema } from "./schemas";

import type {
  PatchOperation,
  PullResponseV1,
  ReadonlyJSONObject,
} from "replicache";
import type { LuciaUser } from "../auth";
import type {
  ClientViewRecord,
  ClientViewRecordEntries,
} from "./client-view-record";

// Implements pull algorithm from Replicache docs (modified)
// https://doc.replicache.dev/strategies/row-version#pull
// Some steps are out of order due to what is included in the transaction
export async function pull(
  user: LuciaUser,
  requestBody: unknown,
): Promise<PullResponseV1> {
  const pull = parse(pullRequestSchema, requestBody);

  // 3: Begin transaction
  const result = await transact(async (tx) => {
    // 1: Fetch previous client view record
    const [prevClientView] = pull.cookie
      ? await tx
          .select({ record: ReplicacheClientView.record })
          .from(ReplicacheClientView)
          .where(
            and(
              eq(ReplicacheClientView.clientGroupId, pull.clientGroupID),
              eq(ReplicacheClientView.version, pull.cookie),
            ),
          )
      : [undefined];

    // 2: Initialize base client view record
    const baseCvr =
      prevClientView?.record ??
      ({
        user: {},
        order: {},
        client: {},
      } satisfies ClientViewRecord);

    // 4: Get client group (insert into db if it doesn't exist)
    const [baseClientGroup] = await tx
      .insert(ReplicacheClientGroup)
      .values({
        id: pull.clientGroupID,
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
    if (baseClientGroup.userId !== user.id) {
      throw new UnauthorizedError("User does not own client group");
    }

    // 6: Read all domain data, just ids and versions
    // 7: Read all clients in the client group
    const [usersMetadata, ordersMetadata, clientsMetadata] = await Promise.all([
      searchUsers(tx, user),
      searchOrders(tx, user),
      searchClients(tx, baseClientGroup.id),
    ]);

    // 8: Build next client view record
    const nextCvr = {
      user: buildCvrEntries(usersMetadata),
      order: buildCvrEntries(ordersMetadata),
      client: buildCvrEntries(clientsMetadata),
    } satisfies ClientViewRecord;

    // 9: Calculate diff
    const diff = diffCvr(baseCvr, nextCvr);

    // 10: If diff is empty, return no-op
    if (prevClientView && isCvrDiffEmpty(diff)) {
      return null;
    }

    // 11: Get entities
    const [users, orders] = await Promise.all([
      tx
        .select()
        .from(User)
        .where(inArray(User.id, diff.user.puts))
        .then((users) => users.map(serializeEntity)),
      tx
        .select()
        .from(Order)
        .where(inArray(Order.id, diff.order.puts))
        .then((orders) => orders.map(serializeEntity)),
    ]);

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients = diff.client.puts.reduce((clients, clientId) => {
      clients[clientId] = nextCvr.client[clientId];
      return clients;
    }, {} as ClientViewRecordEntries);

    // 13: new client view record version
    const nextCvrVersion =
      Math.max(pull.cookie ?? 0, baseClientGroup.cvrVersion) + 1;

    // 14: Write client group record
    const nextClientGroup = {
      ...baseClientGroup,
      cvrVersion: nextCvrVersion,
    };
    await tx
      .insert(ReplicacheClientGroup)
      .values(nextClientGroup)
      .onConflictDoUpdate({
        target: ReplicacheClientGroup.id,
        set: {
          userId: nextClientGroup.userId,
          cvrVersion: nextClientGroup.cvrVersion,
          updatedAt: sql`now()`,
        },
      });

    // 16-17: Generate client view record id, store client view record
    await tx.insert(ReplicacheClientView).values({
      clientGroupId: baseClientGroup.id,
      version: nextCvrVersion,
      record: nextCvr,
    });

    // 15: Commit transaction
    return {
      entities: {
        user: { puts: users, dels: diff.user.dels },
        order: { puts: orders, dels: diff.order.dels },
      },
      clients,
      prevCvr: prevClientView?.record,
      nextCvr,
      nextCvrVersion,
    };
  });

  // 10: If transaction result returns empty diff, return no-op
  if (!result) {
    return {
      patch: [],
      cookie: pull.cookie,
      lastMutationIDChanges: {},
    };
  }

  return {
    // 18(i): Build patch
    patch: buildPatch(result.entities, result.prevCvr === undefined),

    // 18(ii): Construct cookie
    cookie: result.nextCvrVersion,

    // 18(iii): Last mutation ID changes
    lastMutationIDChanges: result.clients,
  };
}

function buildPatch(
  entities: Record<string, { puts: ReadonlyJSONObject[]; dels: string[] }>,
  clear: boolean,
) {
  const patch: Array<PatchOperation> = [];

  if (clear) patch.push({ op: "clear" });

  patch.push(
    ...Object.entries(entities).reduce((patch, [name, { puts, dels }]) => {
      dels.forEach((id) => patch.push({ op: "del", key: `${name}/${id}` }));

      puts.forEach((entity) => {
        if (typeof entity.id === "string") {
          patch.push({
            op: "put",
            key: `${name}/${entity.id}`,
            value: entity,
          });
        }
      });

      return patch;
    }, {} as Array<PatchOperation>),
  );

  return patch;
}
