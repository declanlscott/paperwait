import { sub } from "date-fns";
import { and, eq, lt, sql } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { useAuthenticated } from "../auth/context";
import { REPLICACHE_EXPIRATION_DURATION } from "../constants";
import { serializable, useTransaction } from "../drizzle/transaction";
import { HttpError } from "../errors/http";
import {
  BadRequest,
  ClientStateNotFound,
  MutationConflict,
  Unauthorized,
} from "../errors/replicache";
import { createContext } from "../utils/context";
import { fn } from "../utils/helpers";
import { buildCvr, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import {
  authoritativeMutatorFactory,
  dataQueryFactory,
  metadataQueryFactory,
  syncedTables,
  tables,
} from "./data";
import {
  genericMutationSchema,
  mutationNameSchema,
  pullRequestSchema,
  pushRequestSchema,
} from "./shared";
import {
  replicacheClientGroupsTable,
  replicacheClientsTable,
  replicacheClientViewsTable,
} from "./sql";

import type {
  ClientGroupID,
  PatchOperation,
  PullResponseV1,
  PushResponse,
} from "replicache";
import type { OmitTimestamps } from "../drizzle/columns";
import type { Channel } from "../realtime";
import type {
  ClientViewRecord,
  ClientViewRecordEntries,
} from "./client-view-record";
import type { TableData, TableMetadata } from "./data";
import type { ReplicacheClient, ReplicacheClientGroup } from "./sql";

export const clientGroupFromId = async (id: ClientGroupID) =>
  useTransaction(async (tx) => {
    const { org } = useAuthenticated();

    return tx
      .select({
        id: replicacheClientGroupsTable.id,
        orgId: replicacheClientGroupsTable.orgId,
        cvrVersion: replicacheClientGroupsTable.cvrVersion,
        userId: replicacheClientGroupsTable.userId,
      })
      .from(replicacheClientGroupsTable)
      .where(
        and(
          eq(replicacheClientGroupsTable.id, id),
          eq(replicacheClientGroupsTable.orgId, org.id),
        ),
      )
      .then((rows) => rows.at(0));
  });

export const clientMetadataFromGroupId = async (
  groupId: ReplicacheClientGroup["id"],
) =>
  useTransaction((tx) =>
    tx
      .select({
        id: replicacheClientsTable.id,
        rowVersion: replicacheClientsTable.lastMutationId,
      })
      .from(replicacheClientsTable)
      .where(eq(replicacheClientsTable.clientGroupId, groupId)),
  );

export const clientFromId = async (id: ReplicacheClient["id"]) =>
  useTransaction((tx) =>
    tx
      .select({
        id: replicacheClientsTable.id,
        orgId: replicacheClientsTable.orgId,
        clientGroupId: replicacheClientsTable.clientGroupId,
        lastMutationId: replicacheClientsTable.lastMutationId,
      })
      .from(replicacheClientsTable)
      .where(eq(replicacheClientsTable.id, id))
      .then((rows) => rows.at(0)),
  );

export const putClientGroup = async (
  clientGroup: OmitTimestamps<ReplicacheClientGroup>,
) =>
  useTransaction((tx) =>
    tx
      .insert(replicacheClientGroupsTable)
      .values(clientGroup)
      .onConflictDoUpdate({
        target: [
          replicacheClientGroupsTable.id,
          replicacheClientGroupsTable.orgId,
        ],
        set: { ...clientGroup, updatedAt: sql`now()` },
      }),
  );

export const deleteExpiredClientGroups = async () =>
  useTransaction((tx) =>
    tx
      .delete(replicacheClientGroupsTable)
      .where(
        lt(
          replicacheClientGroupsTable.updatedAt,
          sub(new Date(), REPLICACHE_EXPIRATION_DURATION).toISOString(),
        ),
      ),
  );

export const putClient = async (client: OmitTimestamps<ReplicacheClient>) =>
  useTransaction((tx) =>
    tx
      .insert(replicacheClientsTable)
      .values(client)
      .onConflictDoUpdate({
        target: [replicacheClientsTable.id, replicacheClientsTable.orgId],
        set: { ...client, updatedAt: sql`now()` },
      }),
  );

export const deleteExpiredClients = async () =>
  useTransaction((tx) =>
    tx
      .delete(replicacheClientsTable)
      .where(
        lt(
          replicacheClientsTable.updatedAt,
          sub(new Date(), REPLICACHE_EXPIRATION_DURATION).toISOString(),
        ),
      ),
  );

export async function poke(channels: Array<Channel>) {
  const uniqueChannels = R.unique(channels);
  if (uniqueChannels.length === 0) return;

  const results = await Promise.allSettled(
    uniqueChannels.map(async (channel) => {
      const res = await fetch(`${Resource.Realtime.url}/party/${channel}`, {
        method: "POST",
        headers: { "x-api-key": Resource.Realtime.apiKey },
      });

      if (!res.ok) {
        console.log(`Failed to poke channel "${channel}"`);
        throw new HttpError(res.statusText, res.status);
      }
    }),
  );

  results
    .filter((result) => result.status === "rejected")
    .forEach(({ reason }) => console.error(reason));
}

type PullTransactionResult = {
  data: Array<TableData>;
  clients: ClientViewRecordEntries<typeof replicacheClientsTable>;
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

/**
 * Implements the row version strategy pull algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#pull).
 */
export const pull = fn(
  pullRequestSchema,
  async (pullRequest): Promise<PullResponseV1> => {
    const { user } = useAuthenticated();

    if (pullRequest.pullVersion !== 1)
      return {
        error: "VersionNotSupported",
        versionType: "pull",
      };

    const cookieOrder = pullRequest.cookie?.order ?? 0;

    // 3: Begin transaction
    const result: PullTransactionResult = await serializable(async (tx) => {
      // 1: Fetch previous client view record
      const prevClientView = pullRequest.cookie
        ? await tx
            .select({ record: replicacheClientViewsTable.record })
            .from(replicacheClientViewsTable)
            .where(
              and(
                eq(
                  replicacheClientViewsTable.clientGroupId,
                  pullRequest.clientGroupID,
                ),
                eq(replicacheClientViewsTable.version, cookieOrder),
                eq(replicacheClientViewsTable.orgId, user.orgId),
              ),
            )
            .then((rows) => rows.at(0))
        : undefined;

      // 2: Initialize base client view record
      const baseCvr = buildCvr({
        variant: "base",
        prev: prevClientView?.record,
      });

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
        throw new Unauthorized(
          `User "${user.id}" does not own client group "${baseClientGroup.id}"`,
        );

      // 6: Read all id/version pairs from the database that should be in the client view
      // 7: Read all clients in the client group
      const metadata = await Promise.all(
        tables.map(async (table) => {
          const name = table._.name;

          const metadata = R.uniqueBy(
            await metadataQueryFactory[name](baseClientGroup.id),
            (m) => m.id,
          );

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
      const clients = diff[replicacheClientsTable._.name].puts.reduce(
        (clients, clientId) => {
          clients[clientId] = nextCvr[replicacheClientsTable._.name][clientId];
          return clients;
        },
        {} as ClientViewRecordEntries<typeof replicacheClientsTable>,
      );

      // 13: new client view record version
      const nextCvrVersion =
        Math.max(cookieOrder, baseClientGroup.cvrVersion) + 1;

      const nextClientGroup = {
        ...baseClientGroup,
        cvrVersion: nextCvrVersion,
      };

      await Promise.all([
        // 14: Write client group record
        putClientGroup(nextClientGroup),
        // 16-17: Generate client view record id, store client view record
        tx.insert(replicacheClientViewsTable).values({
          clientGroupId: baseClientGroup.id,
          orgId: user.orgId,
          version: nextCvrVersion,
          record: nextCvr,
        }),
        // Delete old client view records
        tx
          .delete(replicacheClientViewsTable)
          .where(
            and(
              eq(replicacheClientViewsTable.clientGroupId, baseClientGroup.id),
              eq(replicacheClientViewsTable.orgId, user.orgId),
              lt(
                replicacheClientViewsTable.updatedAt,
                sub(new Date(), REPLICACHE_EXPIRATION_DURATION).toISOString(),
              ),
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
        patch: [],
        cookie: pullRequest.cookie,
        lastMutationIDChanges: {},
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
      patch,
      cookie,
      lastMutationIDChanges,
    };
  },
  { Error: BadRequest, args: ["Failed to parse pull request"] },
);

/**
 * Implements the row version strategy push algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#push).
 */
export const push = fn(
  pushRequestSchema,
  async (pushRequest): Promise<PushResponse | null> => {
    if (pushRequest.pushVersion !== 1)
      return { error: "VersionNotSupported", versionType: "push" };

    const context = createContext<{ errorMode: boolean }>();

    for (const mutation of pushRequest.mutations) {
      try {
        // 1: Error mode is initially false
        await context.with({ errorMode: false }, async () =>
          processMutation(mutation),
        );
      } catch (error) {
        console.error(error);

        console.log(
          `Encountered error during push on mutation "${mutation.id}"`,
        );

        if (error instanceof ClientStateNotFound) return { error: error.name };

        console.log(`Retrying mutation "${mutation.id}" in error mode`);

        // retry in error mode
        await context.with({ errorMode: true }, async () =>
          processMutation(mutation),
        );
      }
    }

    const processMutation = fn(
      v.object({
        ...genericMutationSchema.entries,
        name: mutationNameSchema,
      }),
      async (mutation) =>
        // 2: Begin transaction
        serializable(async () => {
          const { user } = useAuthenticated();
          const clientGroupId = pushRequest.clientGroupID;

          // 3: Get client group
          const clientGroup =
            (await clientGroupFromId(clientGroupId)) ??
            ({
              id: clientGroupId,
              orgId: user.orgId,
              cvrVersion: 0,
              userId: user.id,
            } satisfies OmitTimestamps<ReplicacheClientGroup>);

          // 4: Verify requesting user owns the client group
          if (clientGroup.userId !== user.id)
            throw new Unauthorized(
              `User "${user.id}" does not own client group "${clientGroupId}"`,
            );

          // 5: Get client
          const client =
            (await clientFromId(mutation.clientID)) ??
            ({
              id: mutation.clientID,
              orgId: user.orgId,
              clientGroupId: clientGroupId,
              lastMutationId: 0,
            } satisfies OmitTimestamps<ReplicacheClient>);

          // 6: Verify requesting client group owns the client
          if (client.clientGroupId !== clientGroupId)
            throw new Unauthorized(
              `Client ${mutation.clientID} does not belong to client group ${clientGroupId}`,
            );

          if (client.lastMutationId === 0 && mutation.id > 1)
            throw new ClientStateNotFound();

          // 7: Next mutation ID
          const nextMutationId = client.lastMutationId + 1;

          // 8: Rollback and skip if mutation already processed
          if (mutation.id < nextMutationId)
            return console.log(
              `Mutation "${mutation.id}" already processed - skipping`,
            );

          // 9: Rollback and throw if mutation is from the future
          if (mutation.id > nextMutationId)
            throw new MutationConflict(
              `Mutation "${mutation.id}" is from the future - aborting`,
            );

          const start = Date.now();

          // 10. Perform mutation
          if (!context.use().errorMode) {
            try {
              // 10(i): Business logic
              // 10(i)(a): xmin column is automatically updated by Postgres on any affected rows
              await authoritativeMutatorFactory[mutation.name](mutation.args);
            } catch (e) {
              // 10(ii)(a-c): Log, abort, and retry
              console.log(`Error processing mutation "${mutation.id}"`);

              throw e;
            }
          }

          const nextClient = {
            id: client.id,
            orgId: client.orgId,
            clientGroupId,
            lastMutationId: nextMutationId,
          } satisfies OmitTimestamps<ReplicacheClient>;

          await Promise.all([
            // 11. Upsert client group
            await putClientGroup(clientGroup),

            // 12. Upsert client
            await putClient(nextClient),
          ]);

          const end = Date.now();
          console.log(
            `Processed mutation "${mutation.id}" in ${end - start}ms`,
          );
        }),
    );

    return null;
  },
  { Error: BadRequest, args: ["Failed to parse push request"] },
);

export * from "./shared";
