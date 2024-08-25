import { and, eq, sql } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";

import { useAuthenticated } from "../auth/context";
import { useTransaction } from "../drizzle/transaction";
import { HttpError } from "../errors/http";
import { replicacheClientGroups, replicacheClients } from "./sql";

import type { ClientGroupID } from "replicache";
import type { OmitTimestamps } from "../drizzle/columns";
import type { Channel } from "../realtime";
import type { ReplicacheClient, ReplicacheClientGroup } from "./sql";

export const clientGroupFromId = async (id: ClientGroupID) =>
  useTransaction(async (tx) => {
    const { org } = useAuthenticated();

    return tx
      .select({
        id: replicacheClientGroups.id,
        orgId: replicacheClientGroups.orgId,
        cvrVersion: replicacheClientGroups.cvrVersion,
        userId: replicacheClientGroups.userId,
      })
      .from(replicacheClientGroups)
      .where(
        and(
          eq(replicacheClientGroups.id, id),
          eq(replicacheClientGroups.orgId, org.id),
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
        id: replicacheClients.id,
        rowVersion: replicacheClients.lastMutationId,
      })
      .from(replicacheClients)
      .where(eq(replicacheClients.clientGroupId, groupId)),
  );

export const clientFromId = async (id: ReplicacheClient["id"]) =>
  useTransaction((tx) =>
    tx
      .select({
        id: replicacheClients.id,
        orgId: replicacheClients.orgId,
        clientGroupId: replicacheClients.clientGroupId,
        lastMutationId: replicacheClients.lastMutationId,
      })
      .from(replicacheClients)
      .where(eq(replicacheClients.id, id))
      .then((rows) => rows.at(0)),
  );

export const putClientGroup = async (
  clientGroup: OmitTimestamps<ReplicacheClientGroup>,
) =>
  useTransaction((tx) =>
    tx
      .insert(replicacheClientGroups)
      .values(clientGroup)
      .onConflictDoUpdate({
        target: [replicacheClientGroups.id, replicacheClientGroups.orgId],
        set: { ...clientGroup, updatedAt: sql`now()` },
      }),
  );

export const putClient = async (client: OmitTimestamps<ReplicacheClient>) =>
  useTransaction((tx) =>
    tx
      .insert(replicacheClients)
      .values(client)
      .onConflictDoUpdate({
        target: [replicacheClients.id, replicacheClients.orgId],
        set: { ...client, updatedAt: sql`now()` },
      }),
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

export * from "./schemas";
