import {
  clientFromId,
  clientGroupFromId,
  poke,
  putClient,
  putClientGroup,
} from ".";
import { useAuthenticated } from "../auth/context";
import { serializable } from "../drizzle/transaction";
import { BadRequestError } from "../errors/http";
import { Mutation } from "../schemas/mutators";
import { fn } from "../utils/fn";
import { mutators } from "./server-authority";

import type {
  ClientStateNotFoundResponse,
  MutationV1,
  PushRequest,
  VersionNotSupportedResponse,
} from "replicache";
import type { OmitTimestamps } from "../drizzle/columns";
import type { ReplicacheClient, ReplicacheClientGroup } from "./sql";

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
  return await serializable(async () => {
    const { user } = useAuthenticated();

    let channels: Array<string> = [];

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
      throw new Error(
        `User ${user.id} does not own client group ${clientGroupId}`,
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
      await putClientGroup(clientGroup),

      // 12. Upsert client
      await putClient(nextClient),
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
