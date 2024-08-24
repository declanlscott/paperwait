import { and, eq, getTableColumns, lt, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth";
import { getClientGroup } from "../data/get";
import { BadRequestError, UnauthorizedError } from "../errors/http";
import { serializable, useTransaction } from "../orm/transaction";
import { buildCvr, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import {
  dataQueryFactory,
  metadataQueryFactory,
  syncedTables,
  tables,
} from "./data";
import {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientView,
} from "./replicache.sql";

import type {
  ClientStateNotFoundResponse,
  PatchOperation,
  PullRequest,
  PullResponseOKV1,
  VersionNotSupportedResponse,
} from "replicache";
import type {
  ClientViewRecordDiff,
  ClientViewRecordEntries,
} from "./client-view-record";
import type { TableData, TableMetadata } from "./data";

type PullResult =
  | {
      type: "success";
      response: PullResponseOKV1;
    }
  | {
      type: "error";
      response: ClientStateNotFoundResponse | VersionNotSupportedResponse;
    };

// Implements pull algorithm from Replicache docs (modified)
// https://doc.replicache.dev/strategies/row-version#pull
// Some steps may be out of numerical order due to what is included in the transaction
export async function pull(pullRequest: PullRequest): Promise<PullResult> {
  const { user } = useAuthenticated();

  if (pullRequest.pullVersion !== 1)
    return {
      type: "error",
      response: {
        error: "VersionNotSupported",
        versionType: "pull",
      },
    };

  const order = Number(
    typeof pullRequest.cookie === "object"
      ? (pullRequest.cookie?.order ?? 0)
      : pullRequest.cookie,
  );

  if (isNaN(order)) throw new BadRequestError("Cookie order is not a number");

  // 3: Begin transaction
  const result = await serializable(async (tx) => {
    // 1: Fetch previous client view record
    const prevClientView = pullRequest.cookie
      ? await tx
          .select({ record: ReplicacheClientView.record })
          .from(ReplicacheClientView)
          .where(
            and(
              eq(ReplicacheClientView.clientGroupId, pullRequest.clientGroupID),
              eq(ReplicacheClientView.version, order),
              eq(ReplicacheClientView.orgId, user.orgId),
            ),
          )
          .then((rows) => rows.at(0))
      : undefined;

    // 2: Initialize base client view record
    const baseCvr = buildCvr({ variant: "base", prev: prevClientView?.record });

    // 4: Get client group
    const baseClientGroup = await getClientGroup(pullRequest.clientGroupID);

    // 5: Verify requesting client group owns requested client
    if (baseClientGroup.userId !== user.id)
      throw new UnauthorizedError("User does not own client group");

    const metadata = (await Promise.all(
      tables.map(async (table) => {
        const name = table._.name;

        if (name === ReplicacheClient._.name) {
          // 7: Read all clients in the client group
          const metadata = await tx
            .select({
              id: ReplicacheClient.id,
              rowVersion: ReplicacheClient.lastMutationId,
            })
            .from(ReplicacheClient)
            .where(eq(ReplicacheClient.clientGroupId, baseClientGroup.id));

          return [name, metadata];
        }

        // 6: Read all id/version pairs from the database that should be in the client view
        const metadata = await metadataQueryFactory()[name](
          tx
            .select({
              id: table.id,
              rowVersion: sql<number>`"${name}"."xmin"`,
            })
            .from(table)
            .$dynamic(),
        );

        return [name, metadata];
      }),
    )) satisfies Array<TableMetadata>;

    // 8: Build next client view record
    const nextCvr = buildCvr({ variant: "next", metadata });

    // 9: Calculate diff
    const diff = diffCvr(baseCvr, nextCvr);

    // 10: If diff is empty, return no-op
    if (prevClientView && isCvrDiffEmpty(diff)) return null;

    // 11: Read only the data that changed
    const data = await readData(diff);

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients = diff[ReplicacheClient._.name].puts.reduce(
      (clients, clientId) => {
        clients[clientId] = nextCvr[ReplicacheClient._.name][clientId];
        return clients;
      },
      {} as ClientViewRecordEntries<typeof ReplicacheClient>,
    );

    // 13: new client view record version
    const nextCvrVersion = Math.max(order, baseClientGroup.cvrVersion) + 1;

    const nextClientGroup = {
      ...baseClientGroup,
      cvrVersion: nextCvrVersion,
    };

    await Promise.all([
      // 14: Write client group record
      tx
        .insert(ReplicacheClientGroup)
        .values(nextClientGroup)
        .onConflictDoUpdate({
          target: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
          set: {
            orgId: nextClientGroup.orgId,
            userId: nextClientGroup.userId,
            cvrVersion: nextClientGroup.cvrVersion,
            updatedAt: sql`now()`,
          },
        }),
      // 16-17: Generate client view record id, store client view record
      tx.insert(ReplicacheClientView).values({
        clientGroupId: baseClientGroup.id,
        orgId: user.orgId,
        version: nextCvrVersion,
        record: nextCvr,
      }),
      // Delete old client view records
      tx
        .delete(ReplicacheClientView)
        .where(
          and(
            eq(ReplicacheClientView.clientGroupId, baseClientGroup.id),
            eq(ReplicacheClientView.orgId, user.orgId),
            lt(ReplicacheClientView.version, nextCvrVersion - 10),
          ),
        ),
    ]);

    // 15: Commit transaction
    return {
      data,
      clients,
      cvr: {
        prev: {
          value: prevClientView?.record,
        },
        next: {
          value: nextCvr,
          version: nextCvrVersion,
        },
      },
    };
  });

  // 10: If transaction result returns empty diff, return no-op
  if (!result)
    return {
      type: "success",
      response: {
        patch: [],
        cookie: pullRequest.cookie,
        lastMutationIDChanges: {},
      },
    };

  return {
    type: "success",
    response: {
      // 18(i): Build patch
      patch: buildPatch(result.data, result.cvr.prev.value === undefined),

      // 18(ii): Construct cookie
      cookie: result.cvr.next.version,

      // 18(iii): Last mutation ID changes
      lastMutationIDChanges: result.clients,
    },
  };
}

const readData = (diff: ClientViewRecordDiff) =>
  useTransaction((tx) =>
    Promise.all(
      syncedTables.map(async (table) => {
        const name = table._.name;

        const data = await dataQueryFactory()[name](
          tx.select(getTableColumns(table)).from(table).$dynamic(),
          diff[name].puts,
        );

        return [
          name,
          { puts: data, dels: diff[name].dels },
        ] as const satisfies TableData;
      }),
    ),
  );

function buildPatch(data: Array<TableData>, clear: boolean) {
  const patch: Array<PatchOperation> = [];

  if (clear) patch.push({ op: "clear" });

  for (const [name, { puts, dels }] of data) {
    dels.forEach((id) => patch.push({ op: "del", key: `${name}/${id}` }));

    puts.forEach((value) => {
      patch.push({
        op: "put",
        key: `${name}/${value.id}`,
        value,
      });
    });
  }

  return patch;
}
