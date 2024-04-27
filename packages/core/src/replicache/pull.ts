// TODO: Finish implementing pull algorithm
import { and, eq } from "drizzle-orm";
import { parse } from "valibot";

import { ReplicacheClientGroup, ReplicacheClientViewRecord } from ".";
import { transact } from "../database";
import { UnauthorizedError } from "../errors";
import { pullRequestSchema } from "./schemas";

import type { User } from "lucia";
import type { PullRequest } from "./schemas";

// Implements pull algorithm from Replicache docs (modified)
// https://doc.replicache.dev/strategies/row-version#pull
// Some steps are out of order due to what is included in the transaction
export async function pull(user: User, requestBody: unknown) {
  const pull = parse(pullRequestSchema, requestBody);

  // 3: Begin transaction
  const result = await transact(async (tx) => {
    // 1: Fetch previous client view record
    const [prevCvr] = pull.cookie
      ? await tx
          .select()
          .from(ReplicacheClientViewRecord)
          .where(
            and(
              eq(ReplicacheClientViewRecord.clientGroupId, pull.clientGroupId),
              eq(ReplicacheClientViewRecord.id, pull.cookie.order),
            ),
          )
      : [];

    // 2: Initialize base client view record
    const baseCvr = prevCvr ?? {
      data: {},
      clientVersion: 0,
    };

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

    // 8: Build next client view record

    // 9: Calculate differences

    // 10: If no differences, return no-op

    // 11: Get entities

    // 12: Changed clients - no need to re-read clients from database,
    // we already have their versions.

    // 13: new client view record version

    // 14: Write client group record

    // 16: Generate client view record id

    // 17: Store client view record

    // 15: Commit transaction
  }, "serializable");

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
