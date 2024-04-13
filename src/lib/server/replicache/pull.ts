import { z } from "astro/zod";
import { and, eq } from "drizzle-orm";

import { db } from "~/lib/server/db";
import {
  ReplicacheClientGroup,
  ReplicacheClientViewRecord,
} from "~/lib/server/db/schema";
import { transact } from "~/lib/server/db/transaction";

import type { User } from "lucia";
import type { PullResponseV1 } from "replicache";

const pullRequest = z.object({
  clientGroupId: z.string(),
  cookie: z.union([
    z.object({
      order: z.number(),
      cvrId: z.string(),
    }),
    z.null(),
  ]),
});

export async function pull(userId: User["id"], requestBody: unknown) {
  const { clientGroupId, cookie } = pullRequest.parse(requestBody);

  await db
    .insert(ReplicacheClientGroup)
    .values({
      id: clientGroupId,
      userId: userId,
      cvrVersion: 0,
      lastModified: new Date(),
    })
    .onConflictDoNothing();

  await transact(async (tx) => {
    const [group] = await tx
      .select({
        id: ReplicacheClientGroup.id,
        cvrVersion: ReplicacheClientGroup.cvrVersion,
        userId: ReplicacheClientGroup.userId,
      })
      .from(ReplicacheClientGroup)
      .for("update")
      .where(eq(ReplicacheClientGroup.id, clientGroupId));

    const [prevCvr] = cookie
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

    const baseCvr = prevCvr ?? {};

    return;
  });

  return;
}
