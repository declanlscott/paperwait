import { eq } from "drizzle-orm";
import { parse } from "valibot";

import {
  pokeMany,
  ReplicacheClient,
  ReplicacheClientGroup,
  updateUserRole,
} from ".";
import { transact } from "../database";
import { pushRequestSchema } from "./schemas";

import type { User } from "lucia";
import type { Transaction } from "../database";
import type { OmitTimestamps } from "../utils";
import type { Mutation } from "./schemas";

export async function push(user: User, requestBody: unknown) {
  const push = parse(pushRequestSchema, requestBody);

  let entities = new Set<string>();
  for (const mutation of push.mutations) {
    try {
      entities = await processMutation(user, push.clientGroupId, mutation);
    } catch (e) {
      // retry in error mode
      entities = await processMutation(
        user,
        push.clientGroupId,
        mutation,
        true,
      );
    }
  }

  await pokeMany(Array.from(entities));
}

// Implements push algorithm from Replicache docs
// https://doc.replicache.dev/strategies/row-version#push
async function processMutation(
  user: User,
  clientGroupId: string,
  mutation: Mutation,
  // 1: `let errorMode = false`. In JS, we implement this step naturally
  // as a param. In case of failure, caller will call us again with `true`
  errorMode = false,
) {
  // 2: Begin transaction
  return await transact(async (tx) => {
    let entities: string[] = [];

    // 3: Get client group
    const [clientGroup] = (await tx
      .select({
        id: ReplicacheClientGroup.id,
        cvrVersion: ReplicacheClientGroup.cvrVersion,
        userId: ReplicacheClientGroup.userId,
      })
      .from(ReplicacheClientGroup)
      .for("update")
      .where(eq(ReplicacheClientGroup.id, clientGroupId))) ?? [
      {
        id: clientGroupId,
        cvrVersion: 0,
        userId: user.id,
      } satisfies OmitTimestamps<typeof ReplicacheClientGroup.$inferInsert>,
    ];

    // 4: Verify requesting user owns the client group
    if (clientGroup.userId !== user.id) {
      throw new Error(
        `User ${user.id} does not own client group ${clientGroupId}`,
      );
    }

    // 5: Get client
    const [client] = (await tx
      .select({
        id: ReplicacheClient.id,
        clientGroupId: ReplicacheClient.clientGroupId,
        lastMutationId: ReplicacheClient.lastMutationId,
      })
      .from(ReplicacheClient)
      .for("update")
      .where(eq(ReplicacheClient.id, mutation.clientId))) ?? [
      {
        id: mutation.clientId,
        clientGroupId: clientGroupId,
        lastMutationId: 0,
      } satisfies OmitTimestamps<typeof ReplicacheClient.$inferInsert>,
    ];

    // 6: Verify requesting client group owns the client
    if (client.clientGroupId !== clientGroupId) {
      throw new Error(
        `Client ${mutation.clientId} does not belong to client group ${clientGroupId}`,
      );
    }

    // 7: Next mutation ID
    const nextMutationId = client.lastMutationId + 1;

    // 8: Rollback and skip if mutation already processed
    if (mutation.id < nextMutationId) {
      console.log(`Mutation ${mutation.id} already processed - skipping`);

      return new Set(entities);
    }

    // 9: Rollback and throw if mutation is from the future
    if (mutation.id > nextMutationId) {
      throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
    }

    const start = Date.now();

    // 10. Perform mutation
    if (!errorMode) {
      try {
        // 10(i): Business logic
        // 10(i)(a): xmin column is automatically updated by Postgres on any affected rows
        entities = await mutate(tx, user, mutation);
      } catch (e) {
        // 10(ii)(a-c): Log, abort, and retry
        console.error(`Error processing mutation ${mutation.id}:`, e);

        throw e;
      }
    }

    const nextClient = {
      id: client.id,
      clientGroupId,
      lastMutationId: nextMutationId,
    } satisfies OmitTimestamps<typeof ReplicacheClient.$inferInsert>;

    await Promise.allSettled([
      // 11. Upsert client group
      await tx
        .insert(ReplicacheClientGroup)
        .values(clientGroup)
        .onConflictDoUpdate({
          target: ReplicacheClientGroup.id,
          set: { ...clientGroup, updatedAt: new Date() },
        }),

      // 12. Upsert client
      await tx
        .insert(ReplicacheClient)
        .values(nextClient)
        .onConflictDoUpdate({
          target: ReplicacheClient.id,
          set: { ...nextClient, updatedAt: new Date() },
        }),
    ]);

    const end = Date.now();
    console.log(`Processed mutation ${mutation.id} in ${end - start}ms`);

    return new Set(entities);
  });
}

async function mutate(
  tx: Transaction,
  user: User,
  mutation: Mutation,
): Promise<string[]> {
  switch (mutation.name) {
    case "updateUserRole":
      return await updateUserRole(tx, user, mutation);
    default:
      return [];
  }
}
