// TODO: Finish
/* eslint-disable @typescript-eslint/no-unused-vars */
import { and, eq } from "drizzle-orm";
import { parse } from "valibot";

import { ReplicacheClientGroup, ReplicacheClientViewRecord } from ".";
import { db, transact } from "../database";
import { pullRequestSchema } from "./schemas";

import type { User } from "lucia";

export async function pull(user: User, requestBody: unknown) {
  const { clientGroupId, cookie } = parse(pullRequestSchema, requestBody);

  await db
    .insert(ReplicacheClientGroup)
    .values({
      id: clientGroupId,
      userId: user.id,
      cvrVersion: 0,
    })
    .onConflictDoNothing();

  const result = await transact(async (tx) => {
    const [group] = await tx
      .select({
        id: ReplicacheClientGroup.id,
        cvrVersion: ReplicacheClientGroup.cvrVersion,
        userId: ReplicacheClientGroup.userId,
      })
      .from(ReplicacheClientGroup)
      .for("update")
      .where(eq(ReplicacheClientGroup.id, clientGroupId));

    const [oldCvr] = cookie
      ? await tx
          .select()
          .from(ReplicacheClientViewRecord)
          .where(
            and(
              eq(ReplicacheClientViewRecord.clientGroupId, clientGroupId),
              eq(ReplicacheClientViewRecord.id, cookie.order),
            ),
          )
      : [];

    const cvr = oldCvr ?? {
      data: {},
      clientVersion: 0,
    };

    return;
  }, "serializable");

  return;
}
