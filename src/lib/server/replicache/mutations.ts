import { z } from "astro/zod";
import { eq } from "drizzle-orm";

import { userRole, User as UserTable } from "~/lib/server/db/schema";
import { mutationMeta } from "~/lib/shared/replicache";
import { assertRole } from "~/lib/shared/user";
import { schema as nanoIdSchema } from "~/utils/nanoid";

import type { User } from "lucia";
import type { Transaction } from "~/lib/server/db/transaction";
import type { Mutation } from "~/lib/shared/replicache";

export const updateUserRoleSchema = z.object({
  userId: nanoIdSchema,
  role: z.enum(userRole.enumValues),
});

export async function updateUserRole(
  tx: Transaction,
  user: User,
  mutation: Mutation,
) {
  assertRole(user, mutationMeta[mutation.name].roleSet);
  const args = updateUserRoleSchema.parse(mutation.args);

  await tx
    .update(UserTable)
    .set({ role: args.role })
    .where(eq(UserTable.id, args.userId));
}
