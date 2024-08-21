import { eq, sql } from "drizzle-orm";

import { useAuthenticated } from "../auth";
import { BadRequestError } from "../errors/http";
import { serializable } from "../orm/transaction";
import { Mutation } from "../schemas/mutators";
import { mutators } from "../server-authority/mutators";
import { fn } from "../valibot";
import { poke } from "./poke";
import { ReplicacheClient, ReplicacheClientGroup } from "./replicache.sql";

import type {
  ClientStateNotFoundResponse,
  MutationV1,
  PushRequest,
  VersionNotSupportedResponse,
} from "replicache";
import type { OmitTimestamps } from "../types/drizzle";

type PushResult =
  | { type: "success" }
  | {
      type: "error";
      response: ClientStateNotFoundResponse | VersionNotSupportedResponse;
    };

export async function push(pushRequest: PushRequest): Promise<PushResult> {
  if (pushRequest.pushVersion !== 1)
    return {
      type: "error",
      response: { error: "VersionNotSupported", versionType: "push" },
    };

  for (const mutation of pushRequest.mutations) {
    try {
      const channels = await processMutation(
        pushRequest.clientGroupID,
        mutation,
      );

      await poke(channels);
    } catch (e) {
      console.error(e);
      console.log(
        `Encountered error during push on mutation "${mutation.id}" - retrying in error mode`,
      );

      // retry in error mode
      await processMutation(pushRequest.clientGroupID, mutation, true);
    }
  }

  return { type: "success" };
}

// Implements push algorithm from Replicache docs
// https://doc.replicache.dev/strategies/row-version#push
async function processMutation(
  clientGroupId: string,
  mutation: MutationV1,
  // 1: `let errorMode = false`. In JS, we implement this step naturally
  // as a param. In case of failure, caller will call us again with `true`
  errorMode = false,
) {
  // 2: Begin transaction
  return await serializable(async (tx) => {
    const { user } = useAuthenticated();

    let channels: Array<string> = [];

    // 3: Get client group
    const clientGroup = await tx
      .select({
        id: ReplicacheClientGroup.id,
        orgId: ReplicacheClientGroup.orgId,
        cvrVersion: ReplicacheClientGroup.cvrVersion,
        userId: ReplicacheClientGroup.userId,
      })
      .from(ReplicacheClientGroup)
      .where(eq(ReplicacheClientGroup.id, clientGroupId))
      .execute()
      .then((rows): OmitTimestamps<ReplicacheClientGroup> => {
        const result = rows.at(0);

        if (!result)
          return {
            id: clientGroupId,
            orgId: user.orgId,
            cvrVersion: 0,
            userId: user.id,
          };

        return result;
      });

    // 4: Verify requesting user owns the client group
    if (clientGroup.userId !== user.id)
      throw new Error(
        `User ${user.id} does not own client group ${clientGroupId}`,
      );

    // 5: Get client
    const client = await tx
      .select({
        id: ReplicacheClient.id,
        orgId: ReplicacheClient.orgId,
        clientGroupId: ReplicacheClient.clientGroupId,
        lastMutationId: ReplicacheClient.lastMutationId,
      })
      .from(ReplicacheClient)
      .where(eq(ReplicacheClient.id, mutation.clientID))
      .execute()
      .then((rows): OmitTimestamps<ReplicacheClient> => {
        const result = rows.at(0);

        if (!result)
          return {
            id: mutation.clientID,
            orgId: user.orgId,
            clientGroupId: clientGroupId,
            lastMutationId: 0,
          };

        return result;
      });

    // 6: Verify requesting client group owns the client
    if (client.clientGroupId !== clientGroupId)
      throw new Error(
        `Client ${mutation.clientID} does not belong to client group ${clientGroupId}`,
      );

    // 7: Next mutation ID
    const nextMutationId = client.lastMutationId + 1;

    // 8: Rollback and skip if mutation already processed
    if (mutation.id < nextMutationId) {
      console.log(`Mutation "${mutation.id}" already processed - skipping`);

      return channels;
    }

    // 9: Rollback and throw if mutation is from the future
    if (mutation.id > nextMutationId)
      throw new Error(
        `Mutation "${mutation.id}" is from the future - aborting`,
      );

    const start = Date.now();

    // 10. Perform mutation
    if (!errorMode) {
      try {
        // 10(i): Business logic
        // 10(i)(a): xmin column is automatically updated by Postgres on any affected rows
        const mutate = getMutator();

        channels = await mutate(mutation);
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
      await tx
        .insert(ReplicacheClientGroup)
        .values(clientGroup)
        .onConflictDoUpdate({
          target: [ReplicacheClientGroup.id, ReplicacheClientGroup.orgId],
          set: { ...clientGroup, updatedAt: sql`now()` },
        }),

      // 12. Upsert client
      await tx
        .insert(ReplicacheClient)
        .values(nextClient)
        .onConflictDoUpdate({
          target: [ReplicacheClient.id, ReplicacheClient.orgId],
          set: { ...nextClient, updatedAt: sql`now()` },
        }),
    ]);

    const end = Date.now();
    console.log(`Processed mutation "${mutation.id}" in ${end - start}ms`);

    return channels;
  });
}

const getMutator = () =>
  fn(
    Mutation,
    (mutation) => {
      const mutator = mutators[mutation.name]();

      return mutator(mutation.args);
    },
    { Error: BadRequestError, message: "Failed to parse mutation" },
  );
