import { eq } from "drizzle-orm";

import {
  ReplicacheClient,
  ReplicacheClientGroup,
} from "~/lib/server/db/schema";
import { transact } from "~/lib/server/db/transaction";
import { updateUserRole } from "~/lib/server/replicache/mutations";
import { pushRequestSchema } from "~/lib/shared/replicache";

import type { User } from "lucia";
import type { PushRequestV1, ReadonlyJSONValue } from "replicache";
import type { Transaction } from "~/lib/server/db/transaction";
import type { Mutation } from "~/lib/shared/replicache";
import type { OmitTimestamps } from "~/utils/drizzle";

export async function push(user: User, requestBody: ReadonlyJSONValue) {
  const push = pushRequestSchema.parse(requestBody);

  for (const mutation of push.mutations) {
    try {
      await processMutation(user, push.clientGroupId, mutation);
    } catch (e) {
      // retry in error mode
      await processMutation(user, push.clientGroupId, mutation, true);
    }
  }

  return;
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
        mutationId: ReplicacheClient.mutationId,
      })
      .from(ReplicacheClient)
      .for("update")
      .where(eq(ReplicacheClient.id, mutation.clientId))) ?? [
      {
        id: mutation.clientId,
        clientGroupId: clientGroupId,
        mutationId: 0,
      } satisfies OmitTimestamps<typeof ReplicacheClient.$inferInsert>,
    ];

    // 6: Verify requesting client group owns the client
    if (client.clientGroupId !== clientGroupId) {
      throw new Error(
        `Client ${mutation.clientId} does not belong to client group ${clientGroupId}`,
      );
    }

    // 7: Next mutation ID
    const nextMutationId = client.mutationId + 1;

    // 8: Rollback and skip if mutation already processed
    if (mutation.id < nextMutationId) {
      console.log(`Mutation ${mutation.id} already processed - skipping`);

      return;
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
        await mutate(tx, user, mutation);
      } catch (e) {
        // 10(ii)(a-c): Log, abort, and retry
        console.error(`Error processing mutation ${mutation.id}:`, e);

        throw e;
      }
    }

    const nextClient = {
      id: client.id,
      clientGroupId,
      mutationId: nextMutationId,
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
  }, "serializable");
}

async function mutate(tx: Transaction, user: User, mutation: Mutation) {
  switch (mutation.name) {
    case "updateUserRole":
      return await updateUserRole(tx, user, mutation);
    default:
      return;
  }
}
