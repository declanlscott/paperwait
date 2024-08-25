import { and, eq, lt, sql } from "drizzle-orm";

import { clientGroupFromId } from ".";
import { useAuthenticated } from "../auth/context";
import { serializable } from "../drizzle/transaction";
import { BadRequestError, UnauthorizedError } from "../errors/http";
import { buildCvr, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import {
  dataQueryFactory,
  metadataQueryFactory,
  syncedTables,
  tables,
} from "./data";
import {
  replicacheClientGroups,
  replicacheClients,
  replicacheClientViews,
} from "./sql";

import type {
  ClientStateNotFoundResponse,
  PatchOperation,
  PullRequest,
  PullResponseOKV1,
  VersionNotSupportedResponse,
} from "replicache";
import type { OmitTimestamps } from "../drizzle/columns";
import type {
  ClientViewRecord,
  ClientViewRecordEntries,
} from "./client-view-record";
import type { TableData, TableMetadata } from "./data";
import type { ReplicacheClientGroup } from "./sql";

type PullTransactionResult = {
  data: Array<TableData>;
  clients: ClientViewRecordEntries<typeof replicacheClients>;
  cvr: {
    prev: {
      value?: ClientViewRecord;
    };
    next: {
      value: ClientViewRecord;
      version: number;
    };
  };
} | null;

type PullResult =
  | {
      variant: "success";
      response: PullResponseOKV1;
    }
  | {
      variant: "error";
      response: ClientStateNotFoundResponse | VersionNotSupportedResponse;
    };

// Implements pull algorithm from Replicache docs (modified)
// https://doc.replicache.dev/strategies/row-version#pull
// Some steps may be out of numerical order due to what is included in the transaction
export async function pull(pullRequest: PullRequest): Promise<PullResult> {
  const { user } = useAuthenticated();

  if (pullRequest.pullVersion !== 1)
    return {
      variant: "error",
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
  const result: PullTransactionResult = await serializable(async (tx) => {
    // 1: Fetch previous client view record
    const prevClientView = pullRequest.cookie
      ? await tx
          .select({ record: replicacheClientViews.record })
          .from(replicacheClientViews)
          .where(
            and(
              eq(
                replicacheClientViews.clientGroupId,
                pullRequest.clientGroupID,
              ),
              eq(replicacheClientViews.version, order),
              eq(replicacheClientViews.orgId, user.orgId),
            ),
          )
          .then((rows) => rows.at(0))
      : undefined;

    // 2: Initialize base client view record
    const baseCvr = buildCvr({ variant: "base", prev: prevClientView?.record });

    // 4: Get client group
    const baseClientGroup =
      (await clientGroupFromId(pullRequest.clientGroupID)) ??
      ({
        id: pullRequest.clientGroupID,
        orgId: user.orgId,
        cvrVersion: 0,
        userId: user.id,
      } satisfies OmitTimestamps<ReplicacheClientGroup>);

    // 5: Verify requesting client group owns requested client
    if (baseClientGroup.userId !== user.id)
      throw new UnauthorizedError("User does not own client group");

    const metadata = await Promise.all(
      tables.map(async (table) => {
        const name = table._.name;

        // 6: Read all id/version pairs from the database that should be in the client view
        // 7: Read all clients in the client group
        const metadata = await metadataQueryFactory[name](baseClientGroup.id);

        return [name, metadata] satisfies TableMetadata;
      }),
    );

    // 8: Build next client view record
    const nextCvr = buildCvr({ variant: "next", metadata });

    // 9: Calculate diff
    const diff = diffCvr(baseCvr, nextCvr);

    // 10: If diff is empty, return no-op
    if (prevClientView && isCvrDiffEmpty(diff)) return null;

    // 11: Read only the data that changed
    const data = await Promise.all(
      syncedTables.map(async (table) => {
        const name = table._.name;
        const ids = diff[name].puts;

        if (ids.length === 0)
          return [
            name,
            { puts: [], dels: diff[name].dels },
          ] as const satisfies TableData;

        const data = await dataQueryFactory[name](diff[name].puts);

        return [
          name,
          { puts: data, dels: diff[name].dels },
        ] as const satisfies TableData;
      }),
    );

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients = diff[replicacheClients._.name].puts.reduce(
      (clients, clientId) => {
        clients[clientId] = nextCvr[replicacheClients._.name][clientId];
        return clients;
      },
      {} as ClientViewRecordEntries<typeof replicacheClients>,
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
        .insert(replicacheClientGroups)
        .values(nextClientGroup)
        .onConflictDoUpdate({
          target: [replicacheClientGroups.id, replicacheClientGroups.orgId],
          set: {
            orgId: nextClientGroup.orgId,
            userId: nextClientGroup.userId,
            cvrVersion: nextClientGroup.cvrVersion,
            updatedAt: sql`now()`,
          },
        }),
      // 16-17: Generate client view record id, store client view record
      tx.insert(replicacheClientViews).values({
        clientGroupId: baseClientGroup.id,
        orgId: user.orgId,
        version: nextCvrVersion,
        record: nextCvr,
      }),
      // Delete old client view records
      tx
        .delete(replicacheClientViews)
        .where(
          and(
            eq(replicacheClientViews.clientGroupId, baseClientGroup.id),
            eq(replicacheClientViews.orgId, user.orgId),
            lt(replicacheClientViews.version, nextCvrVersion - 10),
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
      variant: "success",
      response: {
        patch: [],
        cookie: pullRequest.cookie,
        lastMutationIDChanges: {},
      },
    };

  // 18(i): Build patch
  const patch: Array<PatchOperation> = [];
  if (result.cvr.prev.value === undefined) patch.push({ op: "clear" });
  for (const [name, { puts, dels }] of result.data) {
    dels.forEach((id) => patch.push({ op: "del", key: `${name}/${id}` }));

    puts.forEach((value) => {
      patch.push({
        op: "put",
        key: `${name}/${value.id}`,
        value,
      });
    });
  }

  // 18(ii): Construct cookie
  const cookie = result.cvr.next.version;

  // 18(iii): Last mutation ID changes
  const lastMutationIDChanges = result.clients;

  return {
    variant: "success",
    response: {
      patch,
      cookie,
      lastMutationIDChanges,
    },
  };
}
